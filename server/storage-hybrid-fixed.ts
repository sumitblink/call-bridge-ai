import { 
  type Campaign, 
  type InsertCampaign, 
  type Agent, 
  type InsertAgent, 
  type Call, 
  type InsertCall, 
  type User, 
  type InsertUser,
  type UpsertUser,
  type Buyer,
  type InsertBuyer,
  type CampaignBuyer,
  type InsertCampaignBuyer,
  type CallLog,
  type InsertCallLog,
} from '@shared/schema';
import type { IStorage } from './storage';
import { DatabaseStorage } from './storage-db';
import { MemStorage } from './storage';

class HybridStorageFixed implements IStorage {
  private databaseStorage: DatabaseStorage;
  private memStorage: MemStorage;
  private useDatabase: boolean = true;

  constructor() {
    this.databaseStorage = new DatabaseStorage();
    this.memStorage = new MemStorage();
    this.initializeDatabase();
  }

  private async initializeDatabase() {
    try {
      if (this.useDatabase) {
        await this.databaseStorage.populateDatabase();
        console.log('PostgreSQL database initialized with sample data');
      }
    } catch (error) {
      console.error('Error initializing database:', error);
      console.log('Falling back to in-memory storage');
      this.useDatabase = false;
    }
  }

  private async executeOperation<T>(
    databaseOp: () => Promise<T>,
    memoryOp: () => Promise<T>
  ): Promise<T> {
    if (this.useDatabase) {
      try {
        return await databaseOp();
      } catch (error) {
        console.warn('Database operation failed, falling back to memory:', error);
        this.useDatabase = false;
        return await memoryOp();
      }
    } else {
      return await memoryOp();
    }
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.executeOperation(
      () => this.databaseStorage.getUser(id),
      () => this.memStorage.getUser(id)
    );
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.executeOperation(
      () => this.databaseStorage.getUserByUsername(username),
      () => this.memStorage.getUserByUsername(username)
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.executeOperation(
      () => this.databaseStorage.getUserByEmail(email),
      () => this.memStorage.getUserByEmail(email)
    );
  }

  async createUser(user: InsertUser): Promise<User> {
    return this.executeOperation(
      () => this.databaseStorage.createUser(user),
      () => this.memStorage.createUser(user)
    );
  }

  async upsertUser(user: UpsertUser): Promise<User> {
    return this.executeOperation(
      () => this.databaseStorage.upsertUser(user),
      () => this.memStorage.upsertUser(user)
    );
  }

  // Campaigns
  async getCampaigns(): Promise<Campaign[]> {
    return this.executeOperation(
      () => this.databaseStorage.getCampaigns(),
      () => this.memStorage.getCampaigns()
    );
  }

  async getCampaign(id: number): Promise<Campaign | undefined> {
    return this.executeOperation(
      () => this.databaseStorage.getCampaign(id),
      () => this.memStorage.getCampaign(id)
    );
  }

  async getCampaignByPhoneNumber(phoneNumber: string): Promise<Campaign | undefined> {
    return this.executeOperation(
      () => this.databaseStorage.getCampaignByPhoneNumber(phoneNumber),
      () => this.memStorage.getCampaignByPhoneNumber(phoneNumber)
    );
  }

  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    return this.executeOperation(
      () => this.databaseStorage.createCampaign(campaign),
      () => this.memStorage.createCampaign(campaign)
    );
  }

  async updateCampaign(id: number, campaign: Partial<InsertCampaign>): Promise<Campaign | undefined> {
    return this.executeOperation(
      () => this.databaseStorage.updateCampaign(id, campaign),
      () => this.memStorage.updateCampaign(id, campaign)
    );
  }

  async deleteCampaign(id: number): Promise<boolean> {
    return this.executeOperation(
      () => this.databaseStorage.deleteCampaign(id),
      () => this.memStorage.deleteCampaign(id)
    );
  }

  // Buyers
  async getBuyers(): Promise<Buyer[]> {
    return this.executeOperation(
      () => this.databaseStorage.getBuyers(),
      () => this.memStorage.getBuyers()
    );
  }

  async getBuyer(id: number): Promise<Buyer | undefined> {
    return this.executeOperation(
      () => this.databaseStorage.getBuyer(id),
      () => this.memStorage.getBuyer(id)
    );
  }

  async createBuyer(buyer: InsertBuyer): Promise<Buyer> {
    return this.executeOperation(
      () => this.databaseStorage.createBuyer(buyer),
      () => this.memStorage.createBuyer(buyer)
    );
  }

  async updateBuyer(id: number, buyer: Partial<InsertBuyer>): Promise<Buyer | undefined> {
    return this.executeOperation(
      () => this.databaseStorage.updateBuyer(id, buyer),
      () => this.memStorage.updateBuyer(id, buyer)
    );
  }

  async deleteBuyer(id: number): Promise<boolean> {
    return this.executeOperation(
      () => this.databaseStorage.deleteBuyer(id),
      () => this.memStorage.deleteBuyer(id)
    );
  }

  // Campaign-Buyer Relations
  async getCampaignBuyers(campaignId: number): Promise<Buyer[]> {
    return this.executeOperation(
      () => this.databaseStorage.getCampaignBuyers(campaignId),
      () => this.memStorage.getCampaignBuyers(campaignId)
    );
  }

  async addBuyerToCampaign(campaignId: number, buyerId: number, priority = 1): Promise<CampaignBuyer> {
    return this.executeOperation(
      () => this.databaseStorage.addBuyerToCampaign(campaignId, buyerId, priority),
      () => this.memStorage.addBuyerToCampaign(campaignId, buyerId, priority)
    );
  }

  async removeBuyerFromCampaign(campaignId: number, buyerId: number): Promise<boolean> {
    return this.executeOperation(
      () => this.databaseStorage.removeBuyerFromCampaign(campaignId, buyerId),
      () => this.memStorage.removeBuyerFromCampaign(campaignId, buyerId)
    );
  }

  async pingBuyersForCall(campaignId: number, callData: any): Promise<Buyer[]> {
    return this.executeOperation(
      () => this.databaseStorage.pingBuyersForCall(campaignId, callData),
      () => this.memStorage.pingBuyersForCall(campaignId, callData)
    );
  }

  async postCallToBuyer(buyerId: number, callData: any): Promise<boolean> {
    return this.executeOperation(
      () => this.databaseStorage.postCallToBuyer(buyerId, callData),
      () => this.memStorage.postCallToBuyer(buyerId, callData)
    );
  }

  // Agents
  async getAgents(): Promise<Agent[]> {
    return this.executeOperation(
      () => this.databaseStorage.getAgents(),
      () => this.memStorage.getAgents()
    );
  }

  async getAgent(id: number): Promise<Agent | undefined> {
    return this.executeOperation(
      () => this.databaseStorage.getAgent(id),
      () => this.memStorage.getAgent(id)
    );
  }

  async createAgent(agent: InsertAgent): Promise<Agent> {
    return this.executeOperation(
      () => this.databaseStorage.createAgent(agent),
      () => this.memStorage.createAgent(agent)
    );
  }

  async updateAgent(id: number, agent: Partial<InsertAgent>): Promise<Agent | undefined> {
    return this.executeOperation(
      () => this.databaseStorage.updateAgent(id, agent),
      () => this.memStorage.updateAgent(id, agent)
    );
  }

  async deleteAgent(id: number): Promise<boolean> {
    return this.executeOperation(
      () => this.databaseStorage.deleteAgent(id),
      () => this.memStorage.deleteAgent(id)
    );
  }

  // Calls
  async getCalls(): Promise<Call[]> {
    return this.executeOperation(
      () => this.databaseStorage.getCalls(),
      () => this.memStorage.getCalls()
    );
  }

  async getCallsByCampaign(campaignId: number): Promise<Call[]> {
    return this.executeOperation(
      () => this.databaseStorage.getCallsByCampaign(campaignId),
      () => this.memStorage.getCallsByCampaign(campaignId)
    );
  }

  async createCall(call: InsertCall): Promise<Call> {
    return this.executeOperation(
      () => this.databaseStorage.createCall(call),
      () => this.memStorage.createCall(call)
    );
  }

  async updateCall(id: number, updates: Partial<InsertCall>): Promise<Call | undefined> {
    return this.executeOperation(
      () => this.databaseStorage.updateCall(id, updates),
      () => this.memStorage.updateCall(id, updates)
    );
  }

  async getCallLogs(callId: number): Promise<CallLog[]> {
    return this.executeOperation(
      () => this.databaseStorage.getCallLogs(callId),
      () => this.memStorage.getCallLogs(callId)
    );
  }

  async createCallLog(log: InsertCallLog): Promise<CallLog> {
    return this.executeOperation(
      () => this.databaseStorage.createCallLog(log),
      () => this.memStorage.createCallLog(log)
    );
  }

  // Stub implementations for IStorage interface compliance
  async getStats() {
    return this.executeOperation(
      () => this.databaseStorage.getStats(),
      () => this.memStorage.getStats()
    );
  }

  async getUrlParameters() {
    return this.executeOperation(
      () => this.databaseStorage.getUrlParameters(),
      () => this.memStorage.getUrlParameters()
    );
  }

  async createUrlParameter(data: any) {
    return this.executeOperation(
      () => this.databaseStorage.createUrlParameter(data),
      () => this.memStorage.createUrlParameter(data)
    );
  }

  async getTrackingPixels() {
    return this.executeOperation(
      () => this.databaseStorage.getTrackingPixels(),
      () => this.memStorage.getTrackingPixels()
    );
  }

  async createTrackingPixel(data: any) {
    return this.executeOperation(
      () => this.databaseStorage.createTrackingPixel(data),
      () => this.memStorage.createTrackingPixel(data)
    );
  }

  async updateTrackingPixel(id: number, data: any) {
    return this.executeOperation(
      () => this.databaseStorage.updateTrackingPixel(id, data),
      () => this.memStorage.updateTrackingPixel(id, data)
    );
  }

  async deleteTrackingPixel(id: number) {
    return this.executeOperation(
      () => this.databaseStorage.deleteTrackingPixel(id),
      () => this.memStorage.deleteTrackingPixel(id)
    );
  }

  async getWebhookConfigs() {
    return this.executeOperation(
      () => this.databaseStorage.getWebhookConfigs(),
      () => this.memStorage.getWebhookConfigs()
    );
  }

  async createWebhookConfig(data: any) {
    return this.executeOperation(
      () => this.databaseStorage.createWebhookConfig(data),
      () => this.memStorage.createWebhookConfig(data)
    );
  }

  async getApiAuthentications() {
    return this.executeOperation(
      () => this.databaseStorage.getApiAuthentications(),
      () => this.memStorage.getApiAuthentications()
    );
  }

  async createApiAuthentication(data: any) {
    return this.executeOperation(
      () => this.databaseStorage.createApiAuthentication(data),
      () => this.memStorage.createApiAuthentication(data)
    );
  }

  async getPlatformIntegrations() {
    return this.executeOperation(
      () => this.databaseStorage.getPlatformIntegrations(),
      () => this.memStorage.getPlatformIntegrations()
    );
  }

  async createPlatformIntegration(data: any) {
    return this.executeOperation(
      () => this.databaseStorage.createPlatformIntegration(data),
      () => this.memStorage.createPlatformIntegration(data)
    );
  }

  async getPublishers() {
    return this.executeOperation(
      () => this.databaseStorage.getPublishers(),
      () => this.memStorage.getPublishers()
    );
  }

  async getPublisher(id: number) {
    return this.executeOperation(
      () => this.databaseStorage.getPublisher(id),
      () => this.memStorage.getPublisher(id)
    );
  }

  async createPublisher(publisher: any) {
    return this.executeOperation(
      () => this.databaseStorage.createPublisher(publisher),
      () => this.memStorage.createPublisher(publisher)
    );
  }

  async updatePublisher(id: number, publisher: any) {
    return this.executeOperation(
      () => this.databaseStorage.updatePublisher(id, publisher),
      () => this.memStorage.updatePublisher(id, publisher)
    );
  }

  async deletePublisher(id: number) {
    return this.executeOperation(
      () => this.databaseStorage.deletePublisher(id),
      () => this.memStorage.deletePublisher(id)
    );
  }

  async getPublisherCampaigns(publisherId: number) {
    return this.executeOperation(
      () => this.databaseStorage.getPublisherCampaigns(publisherId),
      () => this.memStorage.getPublisherCampaigns(publisherId)
    );
  }

  async addPublisherToCampaign(publisherId: number, campaignId: number, customPayout?: string) {
    return this.executeOperation(
      () => this.databaseStorage.addPublisherToCampaign(publisherId, campaignId, customPayout),
      () => this.memStorage.addPublisherToCampaign(publisherId, campaignId, customPayout)
    );
  }

  async removePublisherFromCampaign(publisherId: number, campaignId: number) {
    return this.executeOperation(
      () => this.databaseStorage.removePublisherFromCampaign(publisherId, campaignId),
      () => this.memStorage.removePublisherFromCampaign(publisherId, campaignId)
    );
  }

  // Additional methods required by IStorage interface
  async getCampaignPublishers(campaignId: number) {
    return this.executeOperation(
      () => this.databaseStorage.getCampaignPublishers ? this.databaseStorage.getCampaignPublishers(campaignId) : [],
      () => this.memStorage.getCampaignPublishers ? this.memStorage.getCampaignPublishers(campaignId) : []
    );
  }

  async getPhoneNumbers() {
    return this.executeOperation(
      () => this.databaseStorage.getPhoneNumbers ? this.databaseStorage.getPhoneNumbers() : [],
      () => this.memStorage.getPhoneNumbers ? this.memStorage.getPhoneNumbers() : []
    );
  }

  async getPhoneNumber(id: number) {
    return this.executeOperation(
      () => this.databaseStorage.getPhoneNumber ? this.databaseStorage.getPhoneNumber(id) : undefined,
      () => this.memStorage.getPhoneNumber ? this.memStorage.getPhoneNumber(id) : undefined
    );
  }

  async createPhoneNumber(data: any) {
    return this.executeOperation(
      () => this.databaseStorage.createPhoneNumber ? this.databaseStorage.createPhoneNumber(data) : data,
      () => this.memStorage.createPhoneNumber ? this.memStorage.createPhoneNumber(data) : data
    );
  }

  async updatePhoneNumber(id: number, data: any) {
    return this.executeOperation(
      () => this.databaseStorage.updatePhoneNumber ? this.databaseStorage.updatePhoneNumber(id, data) : data,
      () => this.memStorage.updatePhoneNumber ? this.memStorage.updatePhoneNumber(id, data) : data
    );
  }

  async deletePhoneNumber(id: number) {
    return this.executeOperation(
      () => this.databaseStorage.deletePhoneNumber ? this.databaseStorage.deletePhoneNumber(id) : true,
      () => this.memStorage.deletePhoneNumber ? this.memStorage.deletePhoneNumber(id) : true
    );
  }

  async getCampaignPhoneNumbers(campaignId: number) {
    return this.executeOperation(
      () => this.databaseStorage.getCampaignPhoneNumbers ? this.databaseStorage.getCampaignPhoneNumbers(campaignId) : [],
      () => this.memStorage.getCampaignPhoneNumbers ? this.memStorage.getCampaignPhoneNumbers(campaignId) : []
    );
  }

  async assignPhoneNumberToCampaign(phoneNumberId: number, campaignId: number) {
    return this.executeOperation(
      () => this.databaseStorage.assignPhoneNumberToCampaign ? this.databaseStorage.assignPhoneNumberToCampaign(phoneNumberId, campaignId) : true,
      () => this.memStorage.assignPhoneNumberToCampaign ? this.memStorage.assignPhoneNumberToCampaign(phoneNumberId, campaignId) : true
    );
  }

  async unassignPhoneNumberFromCampaign(phoneNumberId: number, campaignId: number) {
    return this.executeOperation(
      () => this.databaseStorage.unassignPhoneNumberFromCampaign ? this.databaseStorage.unassignPhoneNumberFromCampaign(phoneNumberId, campaignId) : true,
      () => this.memStorage.unassignPhoneNumberFromCampaign ? this.memStorage.unassignPhoneNumberFromCampaign(phoneNumberId, campaignId) : true
    );
  }
}

export const storage = new HybridStorageFixed();