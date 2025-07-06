import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Users, 
  Target, 
  Zap, 
  Shield, 
  Globe, 
  TrendingUp,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  Pin,
  MessageCircle,
  Send,
  MessageSquare,
  Camera,
  Circle,
  Video,
  Hash,
  Tv,
  Square
} from "lucide-react"

export function AboutUs() {
  const features = [
    {
      icon: Users,
      title: "Multi-Platform Management",
      description: "Manage all your social media accounts from one unified dashboard"
    },
    {
      icon: Zap,
      title: "AI-Powered Content",
      description: "Generate engaging content with our advanced AI content generator"
    },
    {
      icon: TrendingUp,
      title: "Advanced Analytics",
      description: "Track performance and engagement across all your platforms"
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Bank-level security to protect your social media accounts"
    },
    {
      icon: Globe,
      title: "Global Scale",
      description: "Trusted by businesses worldwide for social media management"
    },
    {
      icon: Target,
      title: "Smart Automation",
      description: "Automate your posting schedule and engagement strategies"
    }
  ]

  const platforms = [
    { name: "Facebook", icon: Facebook, color: "text-blue-600" },
    { name: "Instagram", icon: Instagram, color: "text-pink-600" },
    { name: "Twitter", icon: Twitter, color: "text-sky-600" },
    { name: "LinkedIn", icon: Linkedin, color: "text-blue-700" },
    { name: "YouTube", icon: Youtube, color: "text-red-600" },
    { name: "Pinterest", icon: Pin, color: "text-red-600" },
    { name: "Discord", icon: MessageCircle, color: "text-purple-600" },
    { name: "Telegram", icon: Send, color: "text-blue-400" },
    { name: "WhatsApp", icon: MessageSquare, color: "text-green-600" },
    { name: "Snapchat", icon: Camera, color: "text-yellow-500" },
    { name: "Reddit", icon: Circle, color: "text-orange-600" },
    { name: "Vimeo", icon: Video, color: "text-blue-600" },
    { name: "Threads", icon: Hash, color: "text-black" },
    { name: "Twitch", icon: Tv, color: "text-purple-600" },
    { name: "Line", icon: MessageSquare, color: "text-green-400" },
    { name: "Tumblr", icon: Square, color: "text-blue-900" },
    { name: "VK (Vkontakte)", icon: Users, color: "text-blue-600" }
  ]

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          About Nexura
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Empowering businesses and creators to manage their social media presence 
          with intelligent automation and powerful analytics.
        </p>
      </div>

      {/* Mission Statement */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
        <CardContent className="p-8">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-200">Our Mission</h2>
            <p className="text-lg text-blue-700 dark:text-blue-300 max-w-4xl mx-auto">
              We believe that every business deserves to have a powerful social media presence. 
              Nexura was built to democratize social media management by providing enterprise-level 
              tools that are accessible, affordable, and easy to use for businesses of all sizes.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Features Grid */}
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-2">Why Choose Nexura?</h2>
          <p className="text-muted-foreground">
            Discover the features that make Nexura the perfect choice for your social media management needs
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <feature.icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Supported Platforms */}
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Supported Platforms</CardTitle>
          <CardDescription className="text-center">
            Connect and manage all your favorite social media platforms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center space-x-8 flex-wrap gap-4">
            {platforms.map((platform) => (
              <div key={platform.name} className="flex items-center space-x-2">
                <platform.icon className={`h-8 w-8 ${platform.color}`} />
                <span className="font-medium">{platform.name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Company Stats */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="text-center">
          <CardContent className="p-6">
            <div className="text-3xl font-bold text-blue-600 mb-2">10K+</div>
            <div className="text-sm text-muted-foreground">Active Users</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-6">
            <div className="text-3xl font-bold text-green-600 mb-2">1M+</div>
            <div className="text-sm text-muted-foreground">Posts Published</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-6">
            <div className="text-3xl font-bold text-purple-600 mb-2">50+</div>
            <div className="text-sm text-muted-foreground">Countries</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-6">
            <div className="text-3xl font-bold text-orange-600 mb-2">99.9%</div>
            <div className="text-sm text-muted-foreground">Uptime</div>
          </CardContent>
        </Card>
      </div>

      {/* Technology Stack */}
      <Card>
        <CardHeader>
          <CardTitle>Built with Modern Technology</CardTitle>
          <CardDescription>
            Nexura is built using cutting-edge technologies to ensure reliability, security, and performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {[
              "React", "TypeScript", "Node.js", "PostgreSQL", "OpenAI", 
              "OAuth 2.0", "JWT", "Tailwind CSS", "Supabase", "Render"
            ].map((tech) => (
              <Badge key={tech} variant="outline" className="text-sm">
                {tech}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 