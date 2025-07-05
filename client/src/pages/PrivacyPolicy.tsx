import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Shield, Eye, Lock, UserCheck, Database, Globe } from "lucide-react"

export function PrivacyPolicy() {
  const lastUpdated = "November 2024"

  const sections = [
    {
      id: "information-collection",
      title: "Information We Collect",
      icon: Database,
      content: [
        {
          subtitle: "Personal Information",
          text: "We collect information you provide directly to us, such as when you create an account, connect social media accounts, or contact us for support. This includes your name, email address, and account credentials for connected platforms."
        },
        {
          subtitle: "Usage Data",
          text: "We automatically collect information about how you use our service, including your IP address, browser type, device information, and activity logs within the platform."
        },
        {
          subtitle: "Social Media Data",
          text: "When you connect your social media accounts, we access and store necessary data to provide our services, including posts, analytics, and account information as permitted by each platform's API."
        }
      ]
    },
    {
      id: "information-use",
      title: "How We Use Your Information",
      icon: Eye,
      content: [
        {
          subtitle: "Service Provision",
          text: "We use your information to provide, maintain, and improve our social media management services, including posting content, analyzing performance, and managing your accounts."
        },
        {
          subtitle: "Communication",
          text: "We may use your contact information to send you service updates, security alerts, and respond to your inquiries."
        },
        {
          subtitle: "Analytics and Improvement",
          text: "We analyze usage patterns to improve our platform, develop new features, and ensure optimal performance."
        }
      ]
    },
    {
      id: "information-sharing",
      title: "Information Sharing",
      icon: Globe,
      content: [
        {
          subtitle: "Third-Party Services",
          text: "We share information with social media platforms and third-party services necessary to provide our services, such as scheduling posts or retrieving analytics data."
        },
        {
          subtitle: "Legal Requirements",
          text: "We may disclose information if required by law, court order, or government request, or to protect our rights, property, or safety."
        },
        {
          subtitle: "Business Transfers",
          text: "In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of the transaction."
        }
      ]
    },
    {
      id: "data-security",
      title: "Data Security",
      icon: Shield,
      content: [
        {
          subtitle: "Security Measures",
          text: "We implement industry-standard security measures to protect your information, including encryption, secure servers, and access controls."
        },
        {
          subtitle: "Data Breach Response",
          text: "In the event of a data breach, we will notify affected users and relevant authorities as required by law."
        },
        {
          subtitle: "Third-Party Security",
          text: "We work with trusted third-party services that maintain their own security standards and comply with applicable privacy laws."
        }
      ]
    },
    {
      id: "user-rights",
      title: "Your Rights",
      icon: UserCheck,
      content: [
        {
          subtitle: "Access and Correction",
          text: "You have the right to access, update, or correct your personal information at any time through your account settings."
        },
        {
          subtitle: "Data Deletion",
          text: "You may request deletion of your personal information, subject to certain legal and operational requirements."
        },
        {
          subtitle: "Opt-Out",
          text: "You can opt out of certain communications and data processing activities by adjusting your account settings or contacting us."
        }
      ]
    },
    {
      id: "cookies-tracking",
      title: "Cookies and Tracking",
      icon: Lock,
      content: [
        {
          subtitle: "Essential Cookies",
          text: "We use essential cookies to provide basic functionality, such as maintaining your login session and remembering your preferences."
        },
        {
          subtitle: "Analytics Cookies",
          text: "We use analytics cookies to understand how users interact with our platform and improve our services."
        },
        {
          subtitle: "Cookie Control",
          text: "You can control cookie settings through your browser, though disabling certain cookies may affect platform functionality."
        }
      ]
    }
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Privacy Policy
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Your privacy is important to us. This policy explains how we collect, use, and protect your information.
        </p>
        <div className="flex justify-center">
          <Badge variant="outline" className="text-sm">
            Last Updated: {lastUpdated}
          </Badge>
        </div>
      </div>

      {/* Privacy Overview */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-200">
              Privacy-First Approach
            </h2>
            <p className="text-blue-700 dark:text-blue-300 max-w-2xl mx-auto">
              At Nexura, we believe in transparent data practices. We collect only what's necessary to provide 
              our services and never sell your personal information to third parties.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Sections */}
      <div className="space-y-6">
        {sections.map((section, index) => (
          <Card key={section.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <section.icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <span>{section.title}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {section.content.map((item, itemIndex) => (
                <div key={itemIndex}>
                  <h4 className="font-semibold text-sm text-blue-800 dark:text-blue-200 mb-2">
                    {item.subtitle}
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.text}
                  </p>
                  {itemIndex < section.content.length - 1 && (
                    <Separator className="mt-4" />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Data Retention */}
      <Card>
        <CardHeader>
          <CardTitle>Data Retention</CardTitle>
          <CardDescription>
            How long we keep your information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">Account Data</h4>
              <p className="text-sm text-muted-foreground">
                We retain your account information for as long as your account remains active or as needed to provide services.
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">Usage Data</h4>
              <p className="text-sm text-muted-foreground">
                Analytics and usage data is typically retained for 24 months to help us improve our services.
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">Social Media Data</h4>
              <p className="text-sm text-muted-foreground">
                Connected account data is retained until you disconnect the account or delete your Nexura account.
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">Legal Requirements</h4>
              <p className="text-sm text-muted-foreground">
                Some data may be retained longer if required by law or for legitimate business purposes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* International Users */}
      <Card>
        <CardHeader>
          <CardTitle>International Users</CardTitle>
          <CardDescription>
            Information for users outside the United States
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              If you are accessing our services from outside the United States, please note that your information 
              may be transferred to and processed in the United States, where our servers are located.
            </p>
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <h4 className="font-semibold mb-2">GDPR Compliance</h4>
              <p className="text-sm text-muted-foreground">
                For users in the European Union, we comply with the General Data Protection Regulation (GDPR) 
                and provide additional rights including data portability and the right to be forgotten.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Changes to Privacy Policy */}
      <Card>
        <CardHeader>
          <CardTitle>Changes to This Privacy Policy</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            We may update this privacy policy from time to time. When we do, we will post the updated policy 
            on this page and update the "Last Updated" date. If we make significant changes, we will notify 
            you by email or through a notice on our platform.
          </p>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <h3 className="font-semibold text-green-800 dark:text-green-200">
              Questions About Privacy?
            </h3>
            <p className="text-sm text-green-700 dark:text-green-300">
              If you have any questions about this privacy policy or how we handle your information, 
              please contact us at privacy@nexura.com or through our contact form.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 