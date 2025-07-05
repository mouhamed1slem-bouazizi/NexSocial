import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/useToast"
import { 
  Trash2, 
  Shield, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  Mail,
  Phone,
  FileText,
  Database,
  User
} from "lucide-react"

export function DataDeletion() {
  const [formData, setFormData] = useState({
    email: '',
    reason: '',
    additionalInfo: ''
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Simulate form submission
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      setSubmitted(true)
      toast({
        title: "Data Deletion Request Submitted",
        description: "We've received your request and will process it within 30 days. You'll receive a confirmation email shortly.",
      })
      
      // Reset form
      setFormData({
        email: '',
        reason: '',
        additionalInfo: ''
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit request. Please try again or contact support.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const dataTypes = [
    {
      category: "Account Information",
      items: ["Profile data", "Email address", "Account settings", "Login history"]
    },
    {
      category: "Social Media Connections",
      items: ["Connected account tokens", "Platform usernames", "Authorization data", "Account metadata"]
    },
    {
      category: "Content Data",
      items: ["Posted content", "Scheduled posts", "Draft posts", "Media uploads"]
    },
    {
      category: "Analytics Data",
      items: ["Performance metrics", "Engagement data", "Usage statistics", "Generated reports"]
    }
  ]

  if (submitted) {
    return (
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Request Submitted Successfully
          </h1>
        </div>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800">
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-4 bg-green-100 dark:bg-green-900 rounded-full">
                  <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-green-800 dark:text-green-200">
                Data Deletion Request Received
              </h2>
              <div className="space-y-2 text-green-700 dark:text-green-300">
                <p className="text-lg">
                  Your request has been submitted and will be processed within 30 days.
                </p>
                <p className="text-sm">
                  Confirmation Number: <strong>DDR-{Date.now().toString().slice(-8)}</strong>
                </p>
                <p className="text-sm">
                  You will receive email updates about the status of your request.
                </p>
              </div>
              <div className="flex justify-center gap-4 mt-6">
                <Button 
                  variant="outline" 
                  className="border-green-300 text-green-700 hover:bg-green-100"
                  onClick={() => setSubmitted(false)}
                >
                  Submit Another Request
                </Button>
                <Button 
                  variant="outline" 
                  className="border-green-300 text-green-700 hover:bg-green-100"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Contact Support
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Data Deletion Request
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Request the deletion of your personal data from our platform. We are committed to protecting your privacy and data rights.
        </p>
      </div>

      {/* Important Notice */}
      <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800 dark:text-orange-200">
          <strong>Important:</strong> Data deletion is permanent and cannot be undone. Please ensure you have downloaded any data you wish to keep before proceeding.
        </AlertDescription>
      </Alert>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Data Deletion Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Submit Data Deletion Request
              </CardTitle>
              <CardDescription>
                Complete this form to request the deletion of your personal data from our platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="Enter the email associated with your account"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    This should match the email address used to create your account
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason for Deletion (Optional)</Label>
                  <Textarea
                    id="reason"
                    value={formData.reason}
                    onChange={(e) => handleChange('reason', e.target.value)}
                    placeholder="Please let us know why you're requesting data deletion..."
                    className="min-h-[80px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="additionalInfo">Additional Information (Optional)</Label>
                  <Textarea
                    id="additionalInfo"
                    value={formData.additionalInfo}
                    onChange={(e) => handleChange('additionalInfo', e.target.value)}
                    placeholder="Any additional details or specific requests..."
                    className="min-h-[80px]"
                  />
                </div>

                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    By submitting this request, you confirm that you are the owner of this account and understand that this action is irreversible.
                  </AlertDescription>
                </Alert>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing Request...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Submit Deletion Request
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Process Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Deletion Process
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center space-y-2">
                  <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                    <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h4 className="font-semibold">1. Request Submitted</h4>
                  <p className="text-sm text-muted-foreground">We receive and verify your deletion request</p>
                </div>
                <div className="text-center space-y-2">
                  <div className="mx-auto w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                    <Database className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h4 className="font-semibold">2. Data Processing</h4>
                  <p className="text-sm text-muted-foreground">We locate and prepare your data for deletion</p>
                </div>
                <div className="text-center space-y-2">
                  <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h4 className="font-semibold">3. Deletion Complete</h4>
                  <p className="text-sm text-muted-foreground">All your data is permanently deleted</p>
                </div>
              </div>
              
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  <strong>Timeline:</strong> Data deletion requests are processed within 30 days as required by privacy regulations. You will receive email confirmations at each stage.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* What Data Gets Deleted */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What Data Gets Deleted</CardTitle>
              <CardDescription>
                Complete list of data that will be removed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {dataTypes.map((dataType, index) => (
                <div key={index} className="space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    {dataType.category}
                  </h4>
                  <ul className="text-xs text-muted-foreground space-y-1 ml-6">
                    {dataType.items.map((item, itemIndex) => (
                      <li key={itemIndex} className="flex items-center gap-2">
                        <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Alternative Options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Alternative Options</CardTitle>
              <CardDescription>
                Consider these options before deleting your data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Account Deactivation</h4>
                <p className="text-xs text-muted-foreground">
                  Temporarily disable your account without losing data
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  <User className="h-4 w-4 mr-2" />
                  Deactivate Account
                </Button>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Data Export</h4>
                <p className="text-xs text-muted-foreground">
                  Download a copy of your data before deletion
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  <FileText className="h-4 w-4 mr-2" />
                  Export Data
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Contact Support */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Need Help?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Contact Support</h4>
                <p className="text-xs text-muted-foreground">
                  Have questions about data deletion? Our team can help.
                </p>
              </div>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full">
                  <Mail className="h-4 w-4 mr-2" />
                  Email Support
                </Button>
                <Button variant="outline" size="sm" className="w-full">
                  <Phone className="h-4 w-4 mr-2" />
                  Live Chat
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Legal Information */}
      <Card>
        <CardHeader>
          <CardTitle>Legal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-semibold mb-2">Your Rights</h4>
              <p className="text-sm text-muted-foreground">
                Under privacy laws including GDPR and CCPA, you have the right to request deletion of your personal data. 
                This request is processed free of charge within the required timeframe.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Data Retention</h4>
              <p className="text-sm text-muted-foreground">
                Some data may be retained for legal compliance, security, or fraud prevention as permitted by law. 
                This includes transaction records and security logs.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Third-Party Data</h4>
              <p className="text-sm text-muted-foreground">
                Data stored on connected social media platforms must be deleted separately through those platforms. 
                We will remove authorization tokens and local copies.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Verification Process</h4>
              <p className="text-sm text-muted-foreground">
                We may require additional verification to ensure the security of your account before processing 
                deletion requests.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 