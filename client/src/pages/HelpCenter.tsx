import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { 
  Search, 
  ChevronDown, 
  ChevronRight,
  HelpCircle, 
  MessageSquare, 
  Book,
  Video,
  Users,
  Zap,
  Settings,
  Link as LinkIcon,
  FileText
} from "lucide-react"

export function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState("")
  const [openSections, setOpenSections] = useState<string[]>(['getting-started'])

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    )
  }

  const helpCategories = [
    {
      id: "getting-started",
      title: "Getting Started",
      icon: Users,
      description: "Learn the basics of using Nexura",
      items: [
        {
          question: "How do I create my first account?",
          answer: "Click 'Sign Up' on our homepage, enter your email and password, then verify your email address. You'll be guided through the setup process."
        },
        {
          question: "How do I connect my social media accounts?",
          answer: "Go to your Dashboard, click 'Connect New Account', select your platform, and follow the OAuth authorization process. We support Facebook, Instagram, Twitter, LinkedIn, and YouTube."
        },
        {
          question: "What social media platforms do you support?",
          answer: "We currently support Facebook, Instagram, Twitter/X, LinkedIn, YouTube, and TikTok. We're constantly adding new platforms based on user feedback."
        },
        {
          question: "Is my data secure?",
          answer: "Yes, we use bank-level encryption and follow industry best practices for data security. We never store your social media passwords - only secure OAuth tokens."
        }
      ]
    },
    {
      id: "posting-scheduling",
      title: "Posting & Scheduling",
      icon: Zap,
      description: "Learn how to create and schedule posts",
      items: [
        {
          question: "How do I schedule a post?",
          answer: "In the Create Post page, write your content, select your platforms, toggle 'Schedule for later', choose your date and time, then click 'Schedule Post'."
        },
        {
          question: "Can I post the same content to multiple platforms?",
          answer: "Yes! Select multiple platforms when creating a post. The content will be optimized for each platform's character limits and requirements."
        },
        {
          question: "What file types can I upload?",
          answer: "We support images (JPG, PNG, GIF, WebP) and videos (MP4, MOV, AVI, WMV, FLV, WebM, MKV, 3GP) up to 50MB each."
        },
        {
          question: "Why did my post fail?",
          answer: "Posts can fail due to expired tokens, platform API issues, or content policy violations. Check your notifications for specific error details."
        }
      ]
    },
    {
      id: "ai-content",
      title: "AI Content Generation",
      icon: MessageSquare,
      description: "Using AI to create engaging content",
      items: [
        {
          question: "How does AI content generation work?",
          answer: "Our AI uses GPT-4 to generate content based on your prompts. Simply describe what you want to post about, select a tone, and the AI will create engaging content."
        },
        {
          question: "Can I edit AI-generated content?",
          answer: "Absolutely! AI-generated content is just a starting point. You can edit, modify, or completely rewrite the content before posting."
        },
        {
          question: "What tones are available?",
          answer: "We offer Professional, Casual, Promotional, Humorous, Inspirational, Educational, and Conversational tones to match your brand voice."
        },
        {
          question: "Is AI content original?",
          answer: "Yes, our AI generates unique content for each request. However, we recommend reviewing and personalizing the content to match your specific brand and audience."
        }
      ]
    },
    {
      id: "analytics",
      title: "Analytics & Reporting",
      icon: Book,
      description: "Understanding your performance data",
      items: [
        {
          question: "What analytics data do you provide?",
          answer: "We provide engagement metrics (likes, comments, shares), reach data, follower growth, and performance comparisons across platforms."
        },
        {
          question: "How often is analytics data updated?",
          answer: "Analytics data is updated every hour for most platforms. Some platforms may have longer delays due to API limitations."
        },
        {
          question: "Can I export my analytics data?",
          answer: "Yes, you can export your analytics data as CSV or PDF reports from the Analytics page."
        },
        {
          question: "Why don't I see data for some posts?",
          answer: "It can take 24-48 hours for complete analytics data to appear. Some platforms have delays in providing engagement metrics."
        }
      ]
    },
    {
      id: "account-settings",
      title: "Account & Settings",
      icon: Settings,
      description: "Managing your Nexura account",
      items: [
        {
          question: "How do I change my password?",
          answer: "Go to Settings > Account, click 'Change Password', enter your current password and new password, then save changes."
        },
        {
          question: "How do I disconnect a social media account?",
          answer: "Go to your Dashboard, find the account you want to disconnect, click the trash icon, and confirm the disconnection."
        },
        {
          question: "Can I delete my Nexura account?",
          answer: "Yes, go to Settings > Account and scroll to the bottom to find the 'Delete Account' option. This action is irreversible."
        },
        {
          question: "How do I update my billing information?",
          answer: "Go to Settings > Billing to update your payment method, billing address, and view your subscription details."
        }
      ]
    },
    {
      id: "troubleshooting",
      title: "Troubleshooting",
      icon: HelpCircle,
      description: "Solutions to common issues",
      items: [
        {
          question: "Why can't I connect my Instagram account?",
          answer: "Make sure you have an Instagram Business account. Personal accounts cannot be connected due to API limitations. Also ensure you're logged into the correct account in your browser."
        },
        {
          question: "My posts aren't appearing on social media",
          answer: "Check if your social media accounts are still connected and tokens haven't expired. Also verify that your posts comply with each platform's content policies."
        },
        {
          question: "The app is loading slowly",
          answer: "Try clearing your browser cache, disabling browser extensions, or switching to a different browser. If issues persist, contact our support team."
        },
        {
          question: "I'm not receiving email notifications",
          answer: "Check your spam folder and ensure notifications are enabled in Settings. Add support@nexura.com to your email whitelist."
        }
      ]
    }
  ]

  const filteredCategories = helpCategories.map(category => ({
    ...category,
    items: category.items.filter(item => 
      searchQuery === "" || 
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.items.length > 0)

  const quickLinks = [
    { title: "Getting Started Guide", icon: Book, href: "#getting-started" },
    { title: "Video Tutorials", icon: Video, href: "#tutorials" },
    { title: "API Documentation", icon: FileText, href: "#api-docs" },
    { title: "Contact Support", icon: MessageSquare, href: "/contact" }
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Help Center
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Find answers to common questions and learn how to make the most of Nexura
        </p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search for help articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-4">
        {quickLinks.map((link, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-4 text-center">
              <div className="flex justify-center mb-3">
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <link.icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <h3 className="font-semibold text-sm">{link.title}</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* FAQ Sections */}
      <div className="space-y-6">
        {filteredCategories.map((category) => {
          const isOpen = openSections.includes(category.id)
          
          return (
            <Card key={category.id}>
              <Collapsible open={isOpen} onOpenChange={() => toggleSection(category.id)}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                          <category.icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="text-left">
                          <CardTitle>{category.title}</CardTitle>
                          <CardDescription>{category.description}</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{category.items.length} articles</Badge>
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    {category.items.map((item, index) => (
                      <div key={index}>
                        <h4 className="font-semibold text-sm mb-2">{item.question}</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {item.answer}
                        </p>
                        {index < category.items.length - 1 && (
                          <hr className="my-4 border-slate-200 dark:border-slate-700" />
                        )}
                      </div>
                    ))}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          )
        })}
      </div>

      {/* Contact Support */}
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                <MessageSquare className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <h3 className="font-semibold text-green-800 dark:text-green-200 text-xl">
              Still Need Help?
            </h3>
            <p className="text-green-700 dark:text-green-300">
              Can't find what you're looking for? Our support team is here to help!
            </p>
            <div className="flex justify-center gap-4">
              <Button variant="outline" className="border-green-300 text-green-700 hover:bg-green-100">
                <MessageSquare className="h-4 w-4 mr-2" />
                Contact Support
              </Button>
              <Button variant="outline" className="border-green-300 text-green-700 hover:bg-green-100">
                <Video className="h-4 w-4 mr-2" />
                Watch Tutorials
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 