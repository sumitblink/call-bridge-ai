import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, ExternalLink, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';

interface CampaignUrlBuilderProps {
  campaignName: string;
}

const getStorageKey = (campaignName: string) => `campaign_url_builder_${campaignName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

export default function CampaignUrlBuilder({ campaignName }: CampaignUrlBuilderProps) {
  const [baseUrl, setBaseUrl] = useState('https://your-website.com');
  const [utmSource, setUtmSource] = useState('');
  const [utmMedium, setUtmMedium] = useState('');
  const [utmCampaign, setUtmCampaign] = useState(campaignName.toLowerCase().replace(/\s+/g, '_'));
  const [utmContent, setUtmContent] = useState('');
  const [utmTerm, setUtmTerm] = useState('');
  const { toast } = useToast();

  // Load saved data from localStorage on component mount
  useEffect(() => {
    try {
      const campaignStorageKey = getStorageKey(campaignName);
      const savedData = localStorage.getItem(campaignStorageKey);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        setBaseUrl(parsed.baseUrl || 'https://your-website.com');
        setUtmSource(parsed.utmSource || '');
        setUtmMedium(parsed.utmMedium || '');
        setUtmContent(parsed.utmContent || '');
        setUtmTerm(parsed.utmTerm || '');
        // Restore campaign name from saved data
        if (parsed.utmCampaign) {
          setUtmCampaign(parsed.utmCampaign);
        }
      }
    } catch (error) {

    }
  }, [campaignName]);

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    const dataToSave = {
      baseUrl,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      utmTerm,
      campaignName: campaignName // Store campaign name for reference
    };
    
    try {
      const campaignStorageKey = getStorageKey(campaignName);
      localStorage.setItem(campaignStorageKey, JSON.stringify(dataToSave));
    } catch (error) {

    }
  }, [baseUrl, utmSource, utmMedium, utmCampaign, utmContent, utmTerm, campaignName]);

  const generateUrl = () => {
    const params = new URLSearchParams();
    if (utmSource) params.append('utm_source', utmSource);
    if (utmMedium) params.append('utm_medium', utmMedium);
    if (utmCampaign) params.append('utm_campaign', utmCampaign);
    if (utmContent) params.append('utm_content', utmContent);
    if (utmTerm) params.append('utm_term', utmTerm);
    
    return `${baseUrl}?${params.toString()}`;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generateUrl());
      toast({
        title: "URL copied!",
        description: "Campaign tracking URL has been copied to your clipboard.",
      });
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Please manually copy the URL below.",
        variant: "destructive",
      });
    }
  };

  const presetCombinations = [
    { name: 'Google Ads', source: 'google', medium: 'cpc', content: 'ad_text' },
    { name: 'Facebook Ads', source: 'facebook', medium: 'social', content: 'ad_image' },
    { name: 'Instagram Ads', source: 'instagram', medium: 'social', content: 'story_ad' },
    { name: 'LinkedIn Ads', source: 'linkedin', medium: 'social', content: 'sponsored_post' },
    { name: 'Email Campaign', source: 'email', medium: 'email', content: 'newsletter' },
    { name: 'YouTube Ads', source: 'youtube', medium: 'video', content: 'video_ad' },
  ];

  const applyPreset = (preset: typeof presetCombinations[0]) => {
    setUtmSource(preset.source);
    setUtmMedium(preset.medium);
    setUtmContent(preset.content);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ExternalLink className="h-5 w-5" />
          Campaign URL Builder
        </CardTitle>
        <CardDescription>
          Generate tracking URLs with UTM parameters for your marketing campaigns
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Presets */}
        <div>
          <Label className="text-sm font-medium">Quick Presets</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
            {presetCombinations.map((preset) => (
              <Button
                key={preset.name}
                variant="outline"
                size="sm"
                onClick={() => applyPreset(preset)}
                className="text-xs"
              >
                {preset.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Base URL */}
        <div>
          <div className="flex items-center gap-2">
            <Label htmlFor="baseUrl">Website URL *</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>The landing page URL where visitors will be directed<br/>
                    Include full URL with https://</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Input
            id="baseUrl"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://your-website.com"
            className="mt-1"
          />
        </div>

        {/* UTM Parameters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Label htmlFor="utmSource">UTM Source *</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Where your traffic comes from (google, facebook, etc.)<br/>
                      Used for attribution analysis</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select value={utmSource} onValueChange={setUtmSource}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select traffic source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="google">Google</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="twitter">Twitter</SelectItem>
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
                <SelectItem value="snapchat">Snapchat</SelectItem>
                <SelectItem value="pinterest">Pinterest</SelectItem>
                <SelectItem value="bing">Bing</SelectItem>
                <SelectItem value="yahoo">Yahoo</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="newsletter">Newsletter</SelectItem>
                <SelectItem value="direct">Direct</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <Label htmlFor="utmMedium">UTM Medium *</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Marketing medium (cpc, social, email, etc.)<br/>
                      Describes how visitors reach your site</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select value={utmMedium} onValueChange={setUtmMedium}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select medium" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cpc">CPC (Cost Per Click)</SelectItem>
                <SelectItem value="social">Social Media</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="organic">Organic Search</SelectItem>
                <SelectItem value="referral">Referral</SelectItem>
                <SelectItem value="direct">Direct</SelectItem>
                <SelectItem value="affiliate">Affiliate</SelectItem>
                <SelectItem value="display">Display Ads</SelectItem>
                <SelectItem value="video">Video Ads</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <Label htmlFor="utmCampaign">UTM Campaign *</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Campaign identifier for tracking performance<br/>
                      Usually matches your campaign name</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="utmCampaign"
              value={utmCampaign}
              onChange={(e) => setUtmCampaign(e.target.value)}
              placeholder="campaign_name"
              className="mt-1"
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <Label htmlFor="utmContent">UTM Content</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Specific ad creative or content variation<br/>
                      Helps differentiate between different ads</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="utmContent"
              value={utmContent}
              onChange={(e) => setUtmContent(e.target.value)}
              placeholder="ad_creative_name"
              className="mt-1"
            />
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="utmTerm">UTM Term</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Keywords or targeting terms (optional)<br/>
                      Useful for paid search campaigns</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="utmTerm"
              value={utmTerm}
              onChange={(e) => setUtmTerm(e.target.value)}
              placeholder="keywords or targeting"
              className="mt-1"
            />
          </div>
        </div>

        {/* Generated URL */}
        <div>
          <Label className="text-sm font-medium">Generated Tracking URL</Label>
          <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-md border">
            <code className="text-sm break-all text-gray-700 dark:text-gray-300">
              {generateUrl()}
            </code>
          </div>
          <Button
            onClick={copyToClipboard}
            className="mt-2"
            disabled={!utmSource || !utmMedium || !utmCampaign}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy URL
          </Button>
        </div>

        {/* Usage Instructions */}
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md p-4">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">How to use:</h4>
          <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>1. Enter your website URL where you want to send traffic</li>
            <li>2. Select the traffic source and medium (or use quick presets)</li>
            <li>3. Customize the campaign name and content as needed</li>
            <li>4. Copy the generated URL and use it in your marketing campaigns</li>
            <li>5. All clicks on this URL will be tracked with proper UTM parameters</li>
            <li>6. Your form data is automatically saved and will persist across page reloads</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}