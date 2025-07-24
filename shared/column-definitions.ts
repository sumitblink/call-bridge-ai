// Column definitions matching Ringba's comprehensive column system
export interface ColumnDefinition {
  id: string;
  label: string;
  category: string;
  dataType: 'string' | 'number' | 'date' | 'boolean' | 'currency' | 'duration';
  defaultVisible: boolean;
  width?: number;
  sortable?: boolean;
  filterable?: boolean;
  description?: string;
}

export const COLUMN_CATEGORIES = [
  'Popular',
  'Call',
  'Impression', 
  'Time',
  'Performance',
  'Adjustment',
  'TCPAShield',
  'ICP',
  'Custom Data Enrichment',
  'IVR',
  'Revenue Recovery',
  'Transcription',
  'Ring Tree',
  'RTB',
  'Ring Tree',
  'Tags',
  'User',
  'Call Info',
  'Display',
  'Location',
  'Connection Info',
  'Technology',
  'End Call',
  'Ivr',
  'Placement Info',
  'Request Info',
  'Dialed Number',
  'Conversion',
  'Request',
  'Facebook',
  'Redtrack CID',
  'Leadid',
  'Zip Code'
] as const;

export const COLUMN_DEFINITIONS: ColumnDefinition[] = [
  // Popular Category (default checked based on Ringba image)
  {
    id: 'campaign',
    label: 'Campaign',
    category: 'Popular',
    dataType: 'string',
    defaultVisible: true,
    width: 200,
    sortable: true,
    filterable: true
  },
  {
    id: 'publisherName',
    label: 'Publisher',
    category: 'Popular',
    dataType: 'string',
    defaultVisible: true,
    width: 150,
    sortable: true,
    filterable: true
  },
  {
    id: 'target',
    label: 'Target',
    category: 'Popular',
    dataType: 'string',
    defaultVisible: true,
    width: 150,
    sortable: true,
    filterable: true
  },
  {
    id: 'targetNumber',
    label: 'Target Number',
    category: 'Popular',
    dataType: 'string',
    defaultVisible: false,
    width: 120
  },
  {
    id: 'buyer',
    label: 'Buyer',
    category: 'Popular',
    dataType: 'string',
    defaultVisible: true,
    width: 150,
    sortable: true,
    filterable: true
  },
  {
    id: 'targetGroup',
    label: 'Target Group',
    category: 'Popular',
    dataType: 'string',
    defaultVisible: false,
    width: 120
  },
  {
    id: 'campaignId',
    label: 'Campaign ID',
    category: 'Popular',
    dataType: 'string',
    defaultVisible: true,
    width: 280,
    sortable: true,
    filterable: true
  },
  {
    id: 'publisherId',
    label: 'Publisher ID',
    category: 'Popular',
    dataType: 'string',
    defaultVisible: false,
    width: 120
  },
  {
    id: 'publisherSubId',
    label: 'Publisher Sub ID',
    category: 'Popular',
    dataType: 'string',
    defaultVisible: false,
    width: 120
  },
  {
    id: 'targetId',
    label: 'Target ID',
    category: 'Popular',
    dataType: 'string',
    defaultVisible: false,
    width: 100
  },
  {
    id: 'targetSubId',
    label: 'Target Sub ID',
    category: 'Popular',
    dataType: 'string',
    defaultVisible: false,
    width: 120
  },
  {
    id: 'buyerId',
    label: 'Buyer ID',
    category: 'Popular',
    dataType: 'string',
    defaultVisible: false,
    width: 100
  },
  {
    id: 'buyerSubId',
    label: 'Buyer Sub ID',
    category: 'Popular',
    dataType: 'string',
    defaultVisible: false,
    width: 120
  },
  {
    id: 'targetGroupId',
    label: 'Target Group ID',
    category: 'Popular',
    dataType: 'string',
    defaultVisible: false,
    width: 120
  },

  // Call Category (key defaults based on image)
  {
    id: 'inboundCallId',
    label: 'Inbound Call ID',
    category: 'Call',
    dataType: 'string',
    defaultVisible: false,
    width: 150
  },
  {
    id: 'callDate',
    label: 'Call Date',
    category: 'Call',
    dataType: 'date',
    defaultVisible: true,
    width: 120,
    sortable: true
  },
  {
    id: 'callerId',
    label: 'Caller ID',
    category: 'Call',
    dataType: 'string',
    defaultVisible: true,
    width: 120,
    filterable: true
  },
  {
    id: 'dialedNumber',
    label: 'Dialed #',
    category: 'Call',
    dataType: 'string',
    defaultVisible: true,
    width: 120,
    filterable: true
  },
  {
    id: 'numberId',
    label: 'Number ID',
    category: 'Call',
    dataType: 'string',
    defaultVisible: false,
    width: 100
  },
  {
    id: 'numberPool',
    label: 'Number Pool',
    category: 'Call',
    dataType: 'string',
    defaultVisible: false,
    width: 120,
    filterable: true
  },
  {
    id: 'numberPoolId',
    label: 'Pool ID',
    category: 'Call',
    dataType: 'number',
    defaultVisible: false,
    width: 80
  },
  {
    id: 'numberPoolUsed',
    label: 'Pool Used',
    category: 'Call',
    dataType: 'boolean',
    defaultVisible: false,
    width: 100
  },
  {
    id: 'callCompleteTimestamp',
    label: 'Call Complete Timestamp',
    category: 'Call',
    dataType: 'date',
    defaultVisible: false,
    width: 180
  },
  {
    id: 'callConnectedTimestamp',
    label: 'Call Connected Timestamp',
    category: 'Call',
    dataType: 'date',
    defaultVisible: false,
    width: 180
  },
  {
    id: 'hangup',
    label: 'Hangup',
    category: 'Call',
    dataType: 'string',
    defaultVisible: false,
    width: 100
  },
  {
    id: 'connected',
    label: 'Connected',
    category: 'Call',
    dataType: 'boolean',
    defaultVisible: false,
    width: 100
  },
  {
    id: 'incomplete',
    label: 'Incomplete',
    category: 'Call',
    dataType: 'boolean',
    defaultVisible: false,
    width: 100
  },
  {
    id: 'hasRecording',
    label: 'Has Recording',
    category: 'Call',
    dataType: 'boolean',
    defaultVisible: false,
    width: 120
  },
  {
    id: 'isLive',
    label: 'Is Live',
    category: 'Call',
    dataType: 'boolean',
    defaultVisible: false,
    width: 80
  },
  {
    id: 'recording',
    label: 'Recording',
    category: 'Call',
    dataType: 'string',
    defaultVisible: false,
    width: 100
  },

  // Impression Category
  {
    id: 'numberPoolUsed',
    label: 'Number Pool Used',
    category: 'Impression',
    dataType: 'string',
    defaultVisible: false,
    width: 150
  },
  {
    id: 'numberPoolId',
    label: 'Number Pool ID',
    category: 'Impression',
    dataType: 'string',
    defaultVisible: false,
    width: 120
  },
  {
    id: 'numberPool',
    label: 'Number Pool',
    category: 'Impression',
    dataType: 'string',
    defaultVisible: false,
    width: 120
  },

  // Time Category (key defaults based on image)
  {
    id: 'timeToCall',
    label: 'Time To Call',
    category: 'Time',
    dataType: 'duration',
    defaultVisible: false,
    width: 100
  },
  {
    id: 'duration',
    label: 'Duration',
    category: 'Time',
    dataType: 'duration',
    defaultVisible: true,
    width: 100,
    sortable: true
  },
  {
    id: 'connectedCallLength',
    label: 'Connected Call Length',
    category: 'Time',
    dataType: 'duration',
    defaultVisible: true,
    width: 150
  },
  {
    id: 'timeToConnect',
    label: 'Time To Connect',
    category: 'Time',
    dataType: 'duration',
    defaultVisible: false,
    width: 120
  },

  // Performance Category (key defaults based on image)
  {
    id: 'noPayoutReason',
    label: 'No Payout Reason',
    category: 'Performance',
    dataType: 'string',
    defaultVisible: false,
    width: 150
  },
  {
    id: 'noConversionReason',
    label: 'No Conversion Reason',
    category: 'Performance',
    dataType: 'string',
    defaultVisible: false,
    width: 150
  },
  {
    id: 'blockReason',
    label: 'Block Reason',
    category: 'Performance',
    dataType: 'string',
    defaultVisible: false,
    width: 120
  },
  {
    id: 'incompleteCallReason',
    label: 'Incomplete Call Reason',
    category: 'Performance',
    dataType: 'string',
    defaultVisible: false,
    width: 150
  },
  {
    id: 'offlineConversionUploaded',
    label: 'Offline Conversion Uploaded',
    category: 'Performance',
    dataType: 'boolean',
    defaultVisible: false,
    width: 180
  },
  {
    id: 'hasPredictiveRouting',
    label: 'Has Predictive Routing',
    category: 'Performance',
    dataType: 'boolean',
    defaultVisible: false,
    width: 150
  },
  {
    id: 'googleAdsIntegrationType',
    label: 'GoogleAds Integration Type',
    category: 'Performance',
    dataType: 'string',
    defaultVisible: false,
    width: 180
  },
  {
    id: 'googleAdsUploadErrorCode',
    label: 'GoogleAds Upload Error Code',
    category: 'Performance',
    dataType: 'string',
    defaultVisible: false,
    width: 180
  },
  {
    id: 'googleAdsSuccessfulUpload',
    label: 'GoogleAds Successful Upload',
    category: 'Performance',
    dataType: 'boolean',
    defaultVisible: false,
    width: 180
  },
  {
    id: 'paidOut',
    label: 'Paid Out',
    category: 'Performance',
    dataType: 'boolean',
    defaultVisible: false,
    width: 100
  },
  {
    id: 'duplicate',
    label: 'Duplicate',
    category: 'Performance',
    dataType: 'boolean',
    defaultVisible: true,
    width: 100
  },
  {
    id: 'previouslyConnected',
    label: 'Previously Connected',
    category: 'Performance',
    dataType: 'boolean',
    defaultVisible: true,
    width: 150
  },
  {
    id: 'previouslyConnectedDate',
    label: 'Previously Connected Date',
    category: 'Performance',
    dataType: 'date',
    defaultVisible: false,
    width: 180
  },
  {
    id: 'previouslyConnectedTarget',
    label: 'Previously Connected Target',
    category: 'Performance',
    dataType: 'string',
    defaultVisible: false,
    width: 180
  },
  {
    id: 'converted',
    label: 'Converted',
    category: 'Performance',
    dataType: 'boolean',
    defaultVisible: false,
    width: 100
  },
  {
    id: 'blocked',
    label: 'Blocked',
    category: 'Performance',
    dataType: 'boolean',
    defaultVisible: false,
    width: 100
  },
  {
    id: 'approvedAdjustment',
    label: 'Approved Adjustment',
    category: 'Performance',
    dataType: 'boolean',
    defaultVisible: false,
    width: 150
  },
  {
    id: 'revenue',
    label: 'Revenue',
    category: 'Performance',
    dataType: 'currency',
    defaultVisible: true,
    width: 100,
    sortable: true
  },
  {
    id: 'profitNetTolco',
    label: 'Profit Net Tolco',
    category: 'Performance',
    dataType: 'currency',
    defaultVisible: false,
    width: 120
  },
  {
    id: 'profit',
    label: 'Profit',
    category: 'Performance',
    dataType: 'currency',
    defaultVisible: true,
    width: 100,
    sortable: true
  },
  {
    id: 'payout',
    label: 'Payout',
    category: 'Performance',
    dataType: 'currency',
    defaultVisible: false,
    width: 100
  },
  {
    id: 'voicemail',
    label: 'Voicemail',
    category: 'Performance',
    dataType: 'boolean',
    defaultVisible: false,
    width: 100
  },
  {
    id: 'totalCost',
    label: 'Total Cost',
    category: 'Performance',
    dataType: 'currency',
    defaultVisible: false,
    width: 100
  },
  {
    id: 'tolcoCost',
    label: 'Tolco Cost',
    category: 'Performance',
    dataType: 'currency',
    defaultVisible: false,
    width: 100
  },

  // Additional essential columns for current functionality
  {
    id: 'status',
    label: 'Status',
    category: 'Call',
    dataType: 'string',
    defaultVisible: true,
    width: 100,
    filterable: true
  },
  {
    id: 'fromNumber',
    label: 'From',
    category: 'Call',
    dataType: 'string',
    defaultVisible: true,
    width: 120,
    filterable: true
  },
  {
    id: 'toNumber',
    label: 'To',
    category: 'Call',
    dataType: 'string',
    defaultVisible: true,
    width: 120,
    filterable: true
  },
  {
    id: 'duplicate',
    label: 'Duplicate',
    category: 'Call',
    dataType: 'string',
    defaultVisible: true,
    width: 100,
    filterable: true
  },
  {
    id: 'previouslyConnected',
    label: 'Previously Connected',
    category: 'Call',
    dataType: 'string',
    defaultVisible: true,
    width: 140,
    filterable: true
  },
  {
    id: 'actions',
    label: 'Actions',
    category: 'Call',
    dataType: 'string',
    defaultVisible: true,
    width: 120,
    sortable: false,
    filterable: false
  }
];

// Helper functions
export function getColumnsByCategory() {
  return COLUMN_DEFINITIONS.reduce((acc, column) => {
    if (!acc[column.category]) {
      acc[column.category] = [];
    }
    acc[column.category].push(column);
    return acc;
  }, {} as Record<string, ColumnDefinition[]>);
}

export function getDefaultVisibleColumns() {
  return COLUMN_DEFINITIONS.filter(col => col.defaultVisible).map(col => col.id);
}

export function getColumnDefinition(columnId: string): ColumnDefinition | undefined {
  return COLUMN_DEFINITIONS.find(col => col.id === columnId);
}