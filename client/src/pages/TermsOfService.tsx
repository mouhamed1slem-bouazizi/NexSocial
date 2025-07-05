import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { FileText, Shield, AlertTriangle, UserX, RefreshCw, DollarSign } from "lucide-react"

export function TermsOfService() {
  const lastUpdated = "November 2024"

  const sections = [
    {
      id: "acceptance",
      title: "Acceptance of Terms",
      icon: FileText,
      content: [
        {
          subtitle: "Agreement",
          text: "By accessing and using Nexura's social media management platform, you accept and agree to be bound by the terms and provision of this agreement."
        },
        {
          subtitle: "Modifications",
          text: "We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting. Your continued use of the service constitutes acceptance of modified terms."
        },
        {
          subtitle: "Age Requirements",
          text: "You must be at least 18 years old to use this service. If you are under 18, you may only use the service with the involvement and consent of a parent or guardian."
        }
      ]
    },
    {
      id: "service-description",
      title: "Service Description",
      icon: Shield,
      content: [
        {
          subtitle: "Platform Features",
          text: "Nexura provides social media management tools including content scheduling, analytics, account management, and AI-powered content generation across multiple platforms."
        },
        {
          subtitle: "Service Availability",
          text: "We strive to maintain 99.9% uptime but do not guarantee uninterrupted service. Maintenance, updates, and technical issues may temporarily affect availability."
        },
        {
          subtitle: "Third-Party Integration",
          text: "Our service integrates with third-party social media platforms. We are not responsible for changes to their APIs, policies, or availability that may affect our service."
        }
      ]
    },
    {
      id: "user-responsibilities",
      title: "User Responsibilities",
      icon: UserX,
      content: [
        {
          subtitle: "Account Security",
          text: "You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account."
        },
        {
          subtitle: "Content Compliance",
          text: "You must ensure all content you post through our platform complies with applicable laws and the terms of service of connected social media platforms."
        },
        {
          subtitle: "Prohibited Activities",
          text: "You may not use our service for illegal activities, spamming, harassment, copyright infringement, or any activity that violates platform policies."
        }
      ]
    },
    {
      id: "payment-billing",
      title: "Payment and Billing",
      icon: DollarSign,
      content: [
        {
          subtitle: "Subscription Fees",
          text: "Certain features may require a paid subscription. Fees are billed in advance and are non-refundable except as required by law."
        },
        {
          subtitle: "Auto-Renewal",
          text: "Subscriptions automatically renew unless cancelled before the renewal date. You can cancel your subscription at any time through your account settings."
        },
        {
          subtitle: "Price Changes",
          text: "We may change subscription prices with 30 days' notice. Price changes will apply to subsequent billing cycles."
        }
      ]
    },
    {
      id: "limitation-liability",
      title: "Limitation of Liability",
      icon: AlertTriangle,
      content: [
        {
          subtitle: "Service Limitations",
          text: "Our service is provided 'as is' without warranties of any kind. We do not guarantee that the service will meet your specific requirements or be error-free."
        },
        {
          subtitle: "Damages",
          text: "We shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the service."
        },
        {
          subtitle: "Maximum Liability",
          text: "Our total liability to you for any claim shall not exceed the amount you paid for the service in the 12 months preceding the claim."
        }
      ]
    },
    {
      id: "termination",
      title: "Termination",
      icon: RefreshCw,
      content: [
        {
          subtitle: "User Termination",
          text: "You may terminate your account at any time by contacting support or using the account deletion feature in your settings."
        },
        {
          subtitle: "Our Termination Rights",
          text: "We may suspend or terminate your account if you violate these terms, engage in prohibited activities, or for any reason at our discretion."
        },
        {
          subtitle: "Effect of Termination",
          text: "Upon termination, your access to the service will cease immediately. We may retain certain data as required by law or for legitimate business purposes."
        }
      ]
    }
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Terms of Service
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Please read these terms carefully before using our social media management platform.
        </p>
        <div className="flex justify-center">
          <Badge variant="outline" className="text-sm">
            Last Updated: {lastUpdated}
          </Badge>
        </div>
      </div>

      {/* Terms Overview */}
      <Card className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950 border-orange-200 dark:border-orange-800">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-full">
                <AlertTriangle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-orange-800 dark:text-orange-200">
              Important Legal Agreement
            </h2>
            <p className="text-orange-700 dark:text-orange-300 max-w-2xl mx-auto">
              By using Nexura, you agree to these terms of service. Please review them carefully 
              as they contain important information about your rights and responsibilities.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Terms Sections */}
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

      {/* Intellectual Property */}
      <Card>
        <CardHeader>
          <CardTitle>Intellectual Property</CardTitle>
          <CardDescription>
            Ownership and usage rights
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">Our Content</h4>
              <p className="text-sm text-muted-foreground">
                All content, features, and functionality of the Nexura platform are owned by us and protected by copyright, trademark, and other laws.
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">Your Content</h4>
              <p className="text-sm text-muted-foreground">
                You retain ownership of content you create and post through our platform. You grant us a license to use, store, and display your content as necessary to provide our services.
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">Third-Party Content</h4>
              <p className="text-sm text-muted-foreground">
                Our platform may contain content from third parties. We do not claim ownership of such content and respect the intellectual property rights of others.
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">License to Use</h4>
              <p className="text-sm text-muted-foreground">
                We grant you a limited, non-exclusive, non-transferable license to use our platform in accordance with these terms.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy and Data */}
      <Card>
        <CardHeader>
          <CardTitle>Privacy and Data Protection</CardTitle>
          <CardDescription>
            How we handle your information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your privacy is important to us. Our collection and use of personal information is governed by our Privacy Policy, 
              which is incorporated into these terms by reference.
            </p>
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <h4 className="font-semibold mb-2">Data Security</h4>
              <p className="text-sm text-muted-foreground">
                We implement reasonable security measures to protect your data, but cannot guarantee absolute security. 
                You acknowledge that you provide information at your own risk.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Governing Law */}
      <Card>
        <CardHeader>
          <CardTitle>Governing Law and Disputes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-semibold mb-2">Governing Law</h4>
              <p className="text-sm text-muted-foreground">
                These terms are governed by the laws of the State of California, United States, 
                without regard to conflict of law principles.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Dispute Resolution</h4>
              <p className="text-sm text-muted-foreground">
                Any disputes will be resolved through binding arbitration in accordance with the 
                Commercial Arbitration Rules of the American Arbitration Association.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Severability */}
      <Card>
        <CardHeader>
          <CardTitle>Miscellaneous</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Severability</h4>
              <p className="text-sm text-muted-foreground">
                If any provision of these terms is found to be unenforceable, the remaining provisions will remain in full force and effect.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Entire Agreement</h4>
              <p className="text-sm text-muted-foreground">
                These terms constitute the entire agreement between you and Nexura regarding the use of our service 
                and supersede all prior agreements and understandings.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <h3 className="font-semibold text-green-800 dark:text-green-200">
              Questions About These Terms?
            </h3>
            <p className="text-sm text-green-700 dark:text-green-300">
              If you have any questions about these terms of service, please contact us at 
              legal@nexura.com or through our contact form.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 