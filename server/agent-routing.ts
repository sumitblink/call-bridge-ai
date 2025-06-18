// Agent Routing Service - Intelligent call routing to available agents
import { db } from './db';
import { agents, agentCampaigns, agentCalls, agentStatusLogs, calls } from '@shared/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';
import type { Agent, InsertAgentCall, InsertAgentStatusLog } from '@shared/schema';

export interface AgentAvailability {
  agentId: number;
  name: string;
  status: string;
  currentCalls: number;
  maxConcurrentCalls: number;
  priority: number;
  skills: string[];
  isAvailable: boolean;
}

export interface CallAssignment {
  callId: number;
  agentId: number;
  assignedAt: Date;
  estimatedWaitTime: number; // seconds
}

export interface RoutingResult {
  success: boolean;
  assignment?: CallAssignment;
  reason: string;
  availableAgents: AgentAvailability[];
}

export class AgentRouter {
  /**
   * Find the best available agent for a call based on skills, availability, and priority
   */
  static async routeCall(
    callId: number, 
    campaignId: number, 
    requiredSkills: string[] = []
  ): Promise<RoutingResult> {
    try {
      // Get all agents assigned to this campaign
      const campaignAgents = await db
        .select({
          agentId: agentCampaigns.agentId,
          priority: agentCampaigns.priority,
          agent: agents,
        })
        .from(agentCampaigns)
        .leftJoin(agents, eq(agentCampaigns.agentId, agents.id))
        .where(
          and(
            eq(agentCampaigns.campaignId, campaignId),
            eq(agentCampaigns.isActive, true),
            eq(agents.isOnline, true),
            inArray(agents.status, ['available'])
          )
        );

      if (campaignAgents.length === 0) {
        return {
          success: false,
          reason: 'No agents available for this campaign',
          availableAgents: []
        };
      }

      // Get current call counts for each agent
      const agentAvailabilities: AgentAvailability[] = [];
      
      for (const { agent, priority } of campaignAgents) {
        if (!agent) continue;

        // Count current active calls for this agent
        const [currentCallsResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(agentCalls)
          .where(
            and(
              eq(agentCalls.agentId, agent.id),
              inArray(agentCalls.status, ['assigned', 'answered'])
            )
          );

        const currentCalls = currentCallsResult?.count || 0;
        const skills = agent.skills || [];
        
        // Check skill requirements
        const hasRequiredSkills = requiredSkills.length === 0 || 
          requiredSkills.every(skill => skills.includes(skill));

        const isAvailable = 
          agent.status === 'available' && 
          currentCalls < agent.maxConcurrentCalls &&
          hasRequiredSkills;

        agentAvailabilities.push({
          agentId: agent.id,
          name: agent.name,
          status: agent.status,
          currentCalls,
          maxConcurrentCalls: agent.maxConcurrentCalls,
          priority: priority,
          skills,
          isAvailable
        });
      }

      // Filter available agents and sort by priority and current load
      const availableAgents = agentAvailabilities
        .filter(agent => agent.isAvailable)
        .sort((a, b) => {
          // First sort by priority (lower number = higher priority)
          if (a.priority !== b.priority) {
            return a.priority - b.priority;
          }
          // Then by current call load (fewer calls = higher priority)
          return a.currentCalls - b.currentCalls;
        });

      if (availableAgents.length === 0) {
        return {
          success: false,
          reason: 'No agents available with required skills',
          availableAgents: agentAvailabilities
        };
      }

      // Assign to the best available agent
      const selectedAgent = availableAgents[0];
      const assignment = await this.assignCallToAgent(callId, selectedAgent.agentId);

      return {
        success: true,
        assignment,
        reason: `Assigned to ${selectedAgent.name} (Priority: ${selectedAgent.priority}, Load: ${selectedAgent.currentCalls}/${selectedAgent.maxConcurrentCalls})`,
        availableAgents: agentAvailabilities
      };

    } catch (error) {
      console.error('Agent routing error:', error);
      return {
        success: false,
        reason: 'Routing system error',
        availableAgents: []
      };
    }
  }

  /**
   * Assign a call to a specific agent
   */
  static async assignCallToAgent(callId: number, agentId: number): Promise<CallAssignment> {
    const assignment: InsertAgentCall = {
      callId,
      agentId,
      status: 'assigned'
    };

    await db.insert(agentCalls).values(assignment);

    // Update agent's current call reference
    await db
      .update(agents)
      .set({ 
        currentCallId: callId,
        lastActivityAt: new Date()
      })
      .where(eq(agents.id, agentId));

    return {
      callId,
      agentId,
      assignedAt: new Date(),
      estimatedWaitTime: 0
    };
  }

  /**
   * Update agent status and log the change
   */
  static async updateAgentStatus(
    agentId: number, 
    newStatus: string, 
    reason?: string
  ): Promise<void> {
    // Get current status
    const [agent] = await db
      .select({ status: agents.status })
      .from(agents)
      .where(eq(agents.id, agentId));

    if (!agent) {
      throw new Error('Agent not found');
    }

    const previousStatus = agent.status;

    // Update agent status
    await db
      .update(agents)
      .set({ 
        status: newStatus,
        lastActivityAt: new Date(),
        isOnline: newStatus !== 'offline',
        loginTime: newStatus === 'available' ? new Date() : undefined
      })
      .where(eq(agents.id, agentId));

    // Log status change
    const statusLog: InsertAgentStatusLog = {
      agentId,
      previousStatus,
      newStatus,
      reason
    };

    await db.insert(agentStatusLogs).values(statusLog);
  }

  /**
   * Get real-time agent dashboard data
   */
  static async getAgentDashboard(): Promise<{
    totalAgents: number;
    onlineAgents: number;
    availableAgents: number;
    busyAgents: number;
    activeCalls: number;
    agentsList: AgentAvailability[];
  }> {
    // Get all agents with current call counts
    const agentsData = await db
      .select({
        agent: agents,
        currentCalls: sql<number>`COALESCE(call_counts.count, 0)`,
      })
      .from(agents)
      .leftJoin(
        sql`(
          SELECT agent_id, COUNT(*) as count 
          FROM agent_calls 
          WHERE status IN ('assigned', 'answered') 
          GROUP BY agent_id
        ) as call_counts`,
        sql`call_counts.agent_id = agents.id`
      );

    const agentsList: AgentAvailability[] = agentsData.map(({ agent, currentCalls }) => ({
      agentId: agent.id,
      name: agent.name,
      status: agent.status,
      currentCalls: currentCalls || 0,
      maxConcurrentCalls: agent.maxConcurrentCalls,
      priority: agent.priority,
      skills: agent.skills || [],
      isAvailable: agent.status === 'available' && (currentCalls || 0) < agent.maxConcurrentCalls
    }));

    const totalAgents = agentsList.length;
    const onlineAgents = agentsList.filter(a => a.agent.isOnline).length;
    const availableAgents = agentsList.filter(a => a.isAvailable).length;
    const busyAgents = agentsList.filter(a => a.status === 'busy').length;
    const activeCalls = agentsList.reduce((sum, a) => sum + a.currentCalls, 0);

    return {
      totalAgents,
      onlineAgents,
      availableAgents,
      busyAgents,
      activeCalls,
      agentsList
    };
  }

  /**
   * Handle call completion and update agent metrics
   */
  static async completeCall(
    callId: number, 
    disposition: string, 
    rating?: number, 
    notes?: string
  ): Promise<void> {
    // Get the agent call assignment
    const [agentCall] = await db
      .select()
      .from(agentCalls)
      .where(eq(agentCalls.callId, callId));

    if (!agentCall) {
      return; // No agent assigned to this call
    }

    // Update agent call record
    await db
      .update(agentCalls)
      .set({
        status: 'completed',
        endedAt: new Date(),
        disposition,
        rating,
        notes
      })
      .where(eq(agentCalls.id, agentCall.id));

    // Update agent metrics
    const [agent] = await db
      .select()
      .from(agents)
      .where(eq(agents.id, agentCall.agentId));

    if (agent) {
      const callDuration = agentCall.answeredAt && agentCall.endedAt ? 
        Math.floor((agentCall.endedAt.getTime() - agentCall.answeredAt.getTime()) / 1000) : 0;

      const newCallsHandled = agent.callsHandled + 1;
      const newTotalTalkTime = agent.totalTalkTime + callDuration;
      const newAverageCallDuration = Math.floor(newTotalTalkTime / newCallsHandled);

      await db
        .update(agents)
        .set({
          currentCallId: null,
          callsHandled: newCallsHandled,
          totalTalkTime: newTotalTalkTime,
          averageCallDuration: newAverageCallDuration,
          lastCallAt: new Date(),
          lastActivityAt: new Date()
        })
        .where(eq(agents.id, agentCall.agentId));
    }
  }

  /**
   * Get agent performance metrics
   */
  static async getAgentMetrics(agentId: number, days: number = 30): Promise<{
    callsHandled: number;
    averageCallDuration: number;
    totalTalkTime: number;
    conversionRate: number;
    averageRating: number;
    statusBreakdown: Record<string, number>;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get call metrics
    const callMetrics = await db
      .select({
        count: sql<number>`COUNT(*)`,
        avgDuration: sql<number>`AVG(CASE WHEN answered_at IS NOT NULL AND ended_at IS NOT NULL THEN EXTRACT(EPOCH FROM (ended_at - answered_at)) ELSE 0 END)`,
        totalDuration: sql<number>`SUM(CASE WHEN answered_at IS NOT NULL AND ended_at IS NOT NULL THEN EXTRACT(EPOCH FROM (ended_at - answered_at)) ELSE 0 END)`,
        avgRating: sql<number>`AVG(rating)`,
        conversions: sql<number>`COUNT(CASE WHEN disposition IN ('sale', 'conversion') THEN 1 END)`
      })
      .from(agentCalls)
      .where(
        and(
          eq(agentCalls.agentId, agentId),
          sql`assigned_at >= ${startDate}`
        )
      );

    // Get status breakdown
    const statusBreakdown = await db
      .select({
        status: agentStatusLogs.newStatus,
        count: sql<number>`COUNT(*)`
      })
      .from(agentStatusLogs)
      .where(
        and(
          eq(agentStatusLogs.agentId, agentId),
          sql`timestamp >= ${startDate}`
        )
      )
      .groupBy(agentStatusLogs.newStatus);

    const metrics = callMetrics[0];
    const breakdown = statusBreakdown.reduce((acc, { status, count }) => {
      acc[status] = count;
      return acc;
    }, {} as Record<string, number>);

    return {
      callsHandled: metrics?.count || 0,
      averageCallDuration: Math.floor(metrics?.avgDuration || 0),
      totalTalkTime: Math.floor(metrics?.totalDuration || 0),
      conversionRate: metrics?.count ? (metrics.conversions / metrics.count) * 100 : 0,
      averageRating: metrics?.avgRating || 0,
      statusBreakdown: breakdown
    };
  }
}