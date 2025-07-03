import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/useToast"
import { useNavigate } from "react-router-dom"
import {
  Target,
  Plus,
  Play,
  Pause,
  Edit,
  Trash2,
  TrendingUp,
  DollarSign,
  Eye,
  MousePointer,
  BarChart3,
  Users
} from "lucide-react"

interface AdCampaign {
  _id: string
  name: string
  platform: string
  status: 'active' | 'paused' | 'completed' | 'draft'
  budget: {
    total: number
    spent: number
    remaining: number
  }
  performance: {
    impressions: number
    clicks: number
    conversions: number
    ctr: number
    cpc: number
    roas: number
  }
  startDate: string
  endDate: string
  objective: string
}

export function AdsManager() {
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    // Mock data for ad campaigns
    const mockCampaigns: AdCampaign[] = [
      {
        _id: '1',
        name: 'Summer Product Launch',
        platform: 'facebook',
        status: 'active',
        budget: {
          total: 1000,
          spent: 650,
          remaining: 350
        },
        performance: {
          impressions: 45000,
          clicks: 1350,
          conversions: 67,
          ctr: 3.0,
          cpc: 0.48,
          roas: 4.2
        },
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z',
        objective: 'conversions'
      },
      {
        _id: '2',
        name: 'Brand Awareness Campaign',
        platform: 'instagram',
        status: 'active',
        budget: {
          total: 500,
          spent: 120,
          remaining: 380
        },
        performance: {
          impressions: 28000,
          clicks: 840,
          conversions: 23,
          ctr: 3.0,
          cpc: 0.14,
          roas: 2.8
        },
        startDate: '2024-01-10T00:00:00Z',
        endDate: '2024-02-10T23:59:59Z',
        objective: 'reach'
      },
      {
        _id: '3',
        name: 'Holiday Sales Push',
        platform: 'google',
        status: 'completed',
        budget: {
          total: 2000,
          spent: 2000,
          remaining: 0
        },
        performance: {
          impressions: 85000,
          clicks: 2550,
          conversions: 145,
          ctr: 3.0,
          cpc: 0.78,
          roas: 5.6
        },
        startDate: '2023-12-01T00:00:00Z',
        endDate: '2023-12-31T23:59:59Z',
        objective: 'sales'
      }
    ]

    setCampaigns(mockCampaigns)
    setLoading(false)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'paused':
        return 'bg-yellow-100 text-yellow-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'facebook':
        return 'bg-blue-500'
      case 'instagram':
        return 'bg-pink-500'
      case 'google':
        return 'bg-red-500'
      case 'linkedin':
        return 'bg-blue-700'
      default:
        return 'bg-gray-500'
    }
  }

  const toggleCampaignStatus = (campaignId: string) => {
    setCampaigns(prev => prev.map(campaign =>
      campaign._id === campaignId
        ? { ...campaign, status: campaign.status === 'active' ? 'paused' : 'active' }
        : campaign
    ))

    toast({
      title: "Success",
      description: "Campaign status updated successfully!",
    })
  }

  const totalBudget = campaigns.reduce((sum, campaign) => sum + campaign.budget.total, 0)
  const totalSpent = campaigns.reduce((sum, campaign) => sum + campaign.budget.spent, 0)
  const totalImpressions = campaigns.reduce((sum, campaign) => sum + campaign.performance.impressions, 0)
  const totalClicks = campaigns.reduce((sum, campaign) => sum + campaign.performance.clicks, 0)
  const averageROAS = campaigns.length > 0
    ? campaigns.reduce((sum, campaign) => sum + campaign.performance.roas, 0) / campaigns.length
    : 0

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-slate-200 rounded"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-48 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Ads Manager
          </h1>
          <p className="text-muted-foreground mt-1">
            Create and manage your advertising campaigns across platforms
          </p>
        </div>
        <Button className="bg-gradient-to-r from-blue-500 to-indigo-600">
          <Plus className="mr-2 h-4 w-4" />
          Create Campaign
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <DollarSign className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  ${totalSpent.toLocaleString()}
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400">Total Spent</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Eye className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                  {(totalImpressions / 1000).toFixed(0)}K
                </p>
                <p className="text-sm text-green-600 dark:text-green-400">Impressions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <MousePointer className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                  {totalClicks.toLocaleString()}
                </p>
                <p className="text-sm text-purple-600 dark:text-purple-400">Clicks</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <TrendingUp className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                  {averageROAS.toFixed(1)}x
                </p>
                <p className="text-sm text-orange-600 dark:text-orange-400">Avg ROAS</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="campaigns" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="audiences">Audiences</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-6">
          {/* Campaigns List */}
          <div className="space-y-4">
            {campaigns.map((campaign) => (
              <Card key={campaign._id} className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${getPlatformColor(campaign.platform)}`}></div>
                      <div>
                        <h3 className="font-semibold text-lg">{campaign.name}</h3>
                        <p className="text-sm text-muted-foreground capitalize">
                          {campaign.platform} • {campaign.objective}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(campaign.status)}>
                        {campaign.status}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleCampaignStatus(campaign._id)}
                      >
                        {campaign.status === 'active' ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Budget</p>
                      <p className="text-lg font-semibold">${campaign.budget.total.toLocaleString()}</p>
                      <Progress
                        value={(campaign.budget.spent / campaign.budget.total) * 100}
                        className="mt-2"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        ${campaign.budget.spent} spent • ${campaign.budget.remaining} remaining
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">Impressions</p>
                      <p className="text-lg font-semibold">{campaign.performance.impressions.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        CTR: {campaign.performance.ctr}%
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">Clicks</p>
                      <p className="text-lg font-semibold">{campaign.performance.clicks.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        CPC: ${campaign.performance.cpc}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">ROAS</p>
                      <p className="text-lg font-semibold">{campaign.performance.roas}x</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {campaign.performance.conversions} conversions
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      {new Date(campaign.startDate).toLocaleDateString()} - {new Date(campaign.endDate).toLocaleDateString()}
                    </span>
                    <Button variant="ghost" size="sm">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Campaign Analytics</CardTitle>
              <CardDescription>
                Detailed performance metrics across all campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Advanced Analytics</h3>
                <p className="text-muted-foreground">
                  Detailed campaign analytics and insights coming soon
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audiences" className="space-y-6">
          <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Audience Management</CardTitle>
              <CardDescription>
                Create and manage custom audiences for your campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Custom Audiences</h3>
                <p className="text-muted-foreground mb-4">
                  Build targeted audiences based on demographics, interests, and behaviors
                </p>
                <Button className="bg-gradient-to-r from-blue-500 to-indigo-600">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Audience
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}