import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, User, MessageCircle, Clock } from "lucide-react";

type FeedbackEntry = {
  id: number;
  userId: number;
  question: string;
  response: string;
  timestamp: string;
  resolved: boolean;
};

type UserInfo = {
  id: number;
  username: string;
};

export default function Queries() {
  // Fetch all feedback entries
  const { data: allFeedback, isLoading } = useQuery<FeedbackEntry[]>({
    queryKey: ['/api/feedback/all'],
  });

  // Fetch user information for mapping
  const { data: currentUser } = useQuery<UserInfo>({
    queryKey: ['/api/auth/user'],
  });

  // Group feedback by user
  const groupedFeedback = allFeedback?.reduce((acc, entry) => {
    const userId = entry.userId;
    if (!acc[userId]) {
      acc[userId] = [];
    }
    acc[userId].push(entry);
    return acc;
  }, {} as Record<number, FeedbackEntry[]>);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatMessage = (text: string) => {
    // Split by double newlines to create paragraphs
    const paragraphs = text.split('\n\n');
    return paragraphs.map((paragraph, index) => (
      <p key={index} className="mb-2 last:mb-0">
        {paragraph}
      </p>
    ));
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading chat history...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Chat Queries</h1>
          <p className="text-gray-600 mt-2">
            All conversations between users and the AI assistant
          </p>
        </div>

        {!groupedFeedback || Object.keys(groupedFeedback).length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No chat history found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedFeedback).map(([userId, entries]) => (
              <Card key={userId}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    User {userId}
                    {currentUser?.id === parseInt(userId) && (
                      <Badge variant="secondary">You</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {entries.length} conversation{entries.length !== 1 ? 's' : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                      {entries.map((entry) => (
                        <div key={entry.id} className="border rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-500">
                              {formatTimestamp(entry.timestamp)}
                            </span>
                          </div>
                          
                          {/* User Question */}
                          {entry.question && entry.question.trim() !== '' ? (
                            <div className="mb-4">
                              <div className="flex items-center gap-2 mb-2">
                                <User className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-medium text-blue-600">User</span>
                              </div>
                              <div className="bg-blue-50 rounded-lg p-3">
                                <p className="text-sm text-gray-900">{entry.question}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="mb-4">
                              <div className="flex items-center gap-2 mb-2">
                                <User className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-medium text-blue-600">User</span>
                              </div>
                              <div className="bg-blue-50 rounded-lg p-3">
                                <p className="text-sm text-gray-500 italic">Question not captured (older entry)</p>
                              </div>
                            </div>
                          )}

                          {/* AI Response */}
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Bot className="h-4 w-4 text-green-600" />
                              <span className="text-sm font-medium text-green-600">AI Assistant</span>
                              <Badge variant="outline" className="text-xs">Claude</Badge>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                              <div className="text-sm text-gray-900">
                                {formatMessage(entry.response)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}