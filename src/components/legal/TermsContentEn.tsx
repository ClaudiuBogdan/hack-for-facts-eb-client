import { Link } from '@tanstack/react-router'

export function TermsContentEn() {
  return (
    <div className="mx-auto w-full max-w-4xl p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Terms of Use</h1>
        <p className="text-sm text-muted-foreground">Effective Date: May 1, 2026 · Version: 3.0</p>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-medium">At a Glance</h2>
        <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
          <li>Informational purposes only; no warranties.</li>
          <li>Independent project; no government affiliation.</li>
          <li>Exports must include attribution to data source and Transparenta.eu.</li>
          <li>Optional user accounts for enhanced features like newsletters, notifications, forum access, and AI research.</li>
          <li>Community forum for civic discussion, integrated with your platform account.</li>
          <li>Tools to contact public institutions on your behalf (opt-in, per action).</li>
          <li>AI-powered research features with proactive notifications (opt-in).</li>
        </ul>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-medium">What changed in version 3.0</h2>
        <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
          <li>Added Community Forum section covering Discourse integration and forum rules.</li>
          <li>Added Correspondence with Public Institutions section for platform-sent emails.</li>
          <li>Added AI-Powered Features section for proactive research notifications.</li>
          <li>Expanded notification types beyond budget reports to include platform updates and campaign alerts.</li>
          <li>Updated data storage and retention to cover forum, correspondence, and AI data.</li>
          <li>Strengthened notification procedure for future terms updates.</li>
        </ul>
      </div>

      <div className="prose prose-slate dark:prose-invert max-w-none">
        <h3>Acceptance</h3>
        <p>By using the Service, you agree to these Terms. If you disagree, please do not use the Service.</p>
        <p>Your use of the Service is also governed by our <Link to="/privacy" className="underline">Privacy Policy</Link> and <Link to="/cookie-policy" className="underline">Cookie Policy</Link>, which describe how we process personal data, including security logs, authentication data, and your communication preferences.</p>

        <h3>Service and data sources</h3>
        <p>The Service provides tools to explore, analyze, and visualize public budget execution data from Romania.</p>
        <ul>
          <li><strong>No Government Affiliation:</strong> Transparenta.eu is an independent project and is not affiliated with, authorized, maintained, sponsored, or endorsed by any Romanian government entity.</li>
          <li><strong>Disclaimer of Warranties and Guarantees:</strong> The Service and all data, content, and visualizations are provided on an "as is" and "as available" basis, without any warranties or guarantees of any kind, express or implied. We explicitly disclaim all warranties, including but not limited to warranties of merchantability, fitness for a particular purpose, accuracy, completeness, timeliness, reliability, or non-infringement. We do not guarantee that the Service will be uninterrupted, error-free, or secure.</li>
          <li><strong>Data Accuracy Is Not Guaranteed:</strong> The financial data is sourced from third-party government portals. We do not create, verify, or audit this data and are not responsible for any errors, omissions, or inaccuracies it may contain. You acknowledge that the data may be incomplete, out of date, or incorrect.</li>
        </ul>

        <h3>User accounts and authentication</h3>
        <ul>
          <li><strong>Optional Accounts:</strong> User accounts are optional. You can use core features without creating an account. Creating an account enables additional features such as newsletters, notifications, saved preferences, forum access, correspondence tools, and AI-powered research.</li>
          <li><strong>Account Creation:</strong> When you create an account, you may be asked to provide certain information such as your email address and name. You are responsible for maintaining the confidentiality of your account credentials.</li>
          <li><strong>Third-Party Authentication:</strong> We use Clerk for authentication services. By creating an account, you also agree to Clerk's terms of service.</li>
          <li><strong>Unified Account:</strong> Your account provides access to all platform features, including the community forum hosted on Discourse. When you access the forum, your user ID, email address, and display name are shared with the forum system via single sign-on (SSO). The forum may store additional data such as your posts, profile information, and activity logs.</li>
          <li><strong>Account Termination:</strong> You may delete your account at any time. Deleting your account will also remove your access to the forum and any associated forum data. We may suspend or terminate accounts that violate these Terms or applicable law.</li>
        </ul>

        <h3>Notifications and communications</h3>
        <ul>
          <li><strong>Subscription:</strong> If you have an account, you may subscribe to receive various types of notifications. All notification types are opt-in: you must explicitly choose to receive each type of communication.</li>
          <li><strong>Budget Reports:</strong> Monthly, quarterly, or annual budget execution reports for entities you follow.</li>
          <li><strong>Campaign Updates:</strong> Notifications about civic campaigns you participate in, including public debate updates and campaign milestones.</li>
          <li><strong>Platform Updates:</strong> Information about new features, improvements, and changes to the platform. This is a separate opt-in category.</li>
          <li><strong>AI Research Alerts:</strong> Notifications about research findings from AI agents monitoring entities you follow. This requires separate, explicit consent as described in the AI-Powered Features section.</li>
          <li><strong>Data Alerts:</strong> Notifications when specific data conditions are met for datasets you monitor, such as significant changes in budget execution or new data availability.</li>
          <li><strong>Forum Notifications:</strong> The community forum may send email notifications for replies, mentions, and periodic digests based on your forum notification preferences. These are managed through the forum settings.</li>
          <li><strong>Unsubscribe:</strong> You may unsubscribe from any notification type at any time via the unsubscribe link in any email, through your notification preferences, through the forum settings, or by contacting us.</li>
          <li><strong>Email Delivery:</strong> We use your email address solely for delivering the notifications you have subscribed to and for essential account-related communications. We do not sell, rent, or share your email address with third parties for marketing purposes.</li>
          <li><strong>Consent:</strong> Non-essential notifications are sent only with your explicit consent. You can withdraw consent for any notification type at any time without affecting your account access or other notification subscriptions.</li>
        </ul>

        <h3>Community forum</h3>
        <ul>
          <li><strong>Forum Access:</strong> The Service includes a community forum for civic discussion, hosted on a self-hosted Discourse instance within the European Union. Forum access is available to registered users who have accepted these Terms.</li>
          <li><strong>Single Sign-On:</strong> The forum uses your Transparenta.eu account for authentication via DiscourseConnect SSO. When you access the forum, your user ID, email address, and display name are transmitted to the forum system. The forum stores this data along with your forum activity, including posts, replies, profile information, reading history, and IP addresses for moderation purposes.</li>
          <li><strong>Anonymous Posting:</strong> You may enable anonymous posting mode in your forum profile settings. When active, your posts appear without any identifying information visible to other users or administrators. The forum system retains a technical record of anonymous posts solely for security and abuse prevention purposes.</li>
          <li><strong>Public Visibility:</strong> Forum posts are publicly readable without an account. By posting on the forum, you acknowledge that your contributions (except anonymous posts) are associated with your display name and are visible to anyone on the internet.</li>
          <li><strong>Content Rules:</strong> You are responsible for all content you post on the forum. The following content is prohibited: false or defamatory statements about individuals or institutions; personal data of third parties without their consent; offensive, discriminatory, or illegal content under Romanian law; spam, commercial solicitation, or off-topic content.</li>
          <li><strong>Moderation:</strong> We reserve the right to remove any content that violates these rules and to suspend or terminate forum access for users who repeatedly violate them. Moderation decisions are made at our discretion.</li>
          <li><strong>Forum Email Notifications:</strong> Discourse has its own email notification system for topic replies, mentions, and digests. These notifications are managed through your forum profile settings and are separate from platform notification preferences.</li>
        </ul>

        <h3>Correspondence with public institutions</h3>
        <ul>
          <li><strong>Email Facilitation:</strong> The Service provides tools to send emails to public institutions regarding budget matters. When you use this feature, the platform sends the email on your behalf from a Transparenta.eu email address, with your identity disclosed in the email body.</li>
          <li><strong>Per-Action Consent:</strong> Each email sent through the platform requires your explicit confirmation before sending. The platform will not send any correspondence without your active approval for that specific email.</li>
          <li><strong>User Responsibility:</strong> You are solely responsible for the content, accuracy, and legality of any correspondence sent through the platform. The platform acts as a technical facilitator and does not review, verify, or endorse the content of your correspondence.</li>
          <li><strong>Funky Citizens Authorization:</strong> For certain campaign-related correspondence (such as public debate requests), you may choose to send the email under the umbrella of Funky Citizens. This requires separate, explicit consent for each individual email, provided through a dedicated checkbox in the correspondence form.</li>
          <li><strong>Record Keeping:</strong> The platform stores records of correspondence sent through the Service, including the recipient institution, date, subject, and content, for your reference and for compliance purposes. You may request deletion of these records at any time.</li>
          <li><strong>No Legal Advice:</strong> The correspondence tools and templates provided are for informational purposes only and do not constitute legal advice. You are responsible for ensuring your correspondence complies with applicable law.</li>
        </ul>

        <h3>AI-powered features</h3>
        <ul>
          <li><strong>Research Agents:</strong> The Service may use AI-powered agents to research public institutions and analyze public budget data. When you opt in, agents may proactively monitor entities you follow and notify you of research findings.</li>
          <li><strong>Explicit Opt-In Required:</strong> Proactive AI research notifications require your separate, explicit consent. This consent is distinct from other notification preferences and can be withdrawn at any time through your notification settings.</li>
          <li><strong>Data Used:</strong> AI agents process only publicly available data, including budget execution data, public institutional records, and other open data sources. Your personal data is not used as input for AI research.</li>
          <li><strong>No Guarantees:</strong> AI-generated research findings are provided for informational purposes only. They may contain errors, omissions, or inaccuracies. You must independently verify all AI-generated findings before relying on them for any purpose.</li>
          <li><strong>Transparency:</strong> Content generated by AI agents is clearly labeled as such. We do not present AI-generated content as human-authored analysis.</li>
        </ul>

        <h3>Security monitoring and logs</h3>
        <ul>
          <li><strong>Security Logs:</strong> For safeguarding accounts and the Service, we maintain basic security logs such as IP address, user agent, timestamps, and actions (e.g., sign-in, unsubscribe) in accordance with our Privacy Policy.</li>
          <li><strong>Limited Retention:</strong> Security logs are retained only for a limited period to detect and prevent abuse, troubleshoot issues, and ensure reliability.</li>
        </ul>

        <h3>User responsibilities and assumption of risk</h3>
        <ul>
          <li><strong>Full Assumption of Risk:</strong> Your use of the Service and reliance on any information or visualization provided is done entirely at your own risk. You are solely responsible for any decisions made or actions taken based on this information.</li>
          <li><strong>Duty to Verify:</strong> You are solely responsible for independently verifying all information against original, official sources before using it for any purpose, including but not limited to journalistic, academic, financial, or legal matters. The content on this site is for general informational purposes only and is not professional, financial, or legal advice.</li>
          <li><strong>Lawful Use:</strong> You agree to use the Service only for lawful purposes and in a manner that does not harm the Service or its users. You must not remove or obscure any attribution notices on exported content.</li>
          <li><strong>Accurate Information:</strong> If you create an account, you agree to provide accurate and current information and to keep your account information updated.</li>
        </ul>

        <h3>Intellectual property</h3>
        <ul>
          <li>Open data follows the source license.</li>
          <li>User annotations created locally remain yours.</li>
          <li>The Service's software, design, and original content are protected by copyright and other intellectual property laws.</li>
        </ul>

        <h3>Exports and attribution</h3>
        <p>Include visible attribution to the data source and Transparenta.eu when sharing charts/maps.</p>
        <blockquote>
          <p><strong>Recommended:</strong> Chart: „Titlul Graficului" | Source: Ministerul Finanțelor, via Transparenta.eu.</p>
        </blockquote>

        <h3>Data storage and retention</h3>
        <ul>
          <li><strong>Account Data:</strong> When you create an account, we store your user ID, name, email address, and notification preferences for as long as your account is active.</li>
          <li><strong>Notification Subscriptions:</strong> We store your notification subscription preferences, including the entities you follow and the types of updates you wish to receive.</li>
          <li><strong>Forum Data:</strong> The forum stores your posts, profile information, reading history, and activity logs for as long as your account is active. Forum data is deleted when you delete your account.</li>
          <li><strong>Correspondence Records:</strong> Records of emails sent to public institutions through the platform are retained for 5 years for compliance with Romanian archival requirements for official correspondence, unless you request earlier deletion.</li>
          <li><strong>AI Research Data:</strong> Results from AI research agents are retained for 1 year, after which they are automatically deleted unless you request earlier deletion.</li>
          <li><strong>Deletion:</strong> You may request deletion of your account and all associated data at any time by contacting us or using account deletion features when available.</li>
        </ul>

        <h3>Limitation of liability</h3>
        <p>To the maximum extent permitted by applicable law, Claudiu Constantin Bogdan and any owners, contributors, and affiliates shall not be liable for any direct, indirect, incidental, special, consequential, or exemplary damages, including but not limited to, damages for loss of profits, revenue, data, goodwill, or other intangible losses, resulting from: (i) your access to, use of, or inability to use the Service; (ii) any reliance on the data, content, or visualizations presented by the Service, regardless of any errors, omissions, or inaccuracies therein; (iii) any financial, professional, personal, or other loss or damage incurred as a result of using the information from the Service; or (iv) any unauthorized access to or use of our servers and any personal information stored therein. This limitation applies whether the alleged liability is based on contract, tort, negligence, strict liability, or any other basis, even if we have been advised of the possibility of such damage. Your sole and exclusive remedy for any dispute with us is to stop using the Service.</p>

        <h3>Availability and changes</h3>
        <p>We may change or discontinue the Service at any time. We may update these Terms from time to time to reflect changes in our practices, new features, or legal requirements.</p>
        <ul>
          <li><strong>Notification of Changes:</strong> For material changes to these Terms, we will provide at least 30 days advance notice by publishing the updated Terms with the future effective date and sending an email notification to registered users.</li>
          <li><strong>Acceptance of Updated Terms:</strong> After the effective date of updated Terms, you will be asked to review and accept the changes on your next login. Continued use of the Service after accepting the updated Terms constitutes your agreement to the changes.</li>
          <li><strong>Version History:</strong> Previous versions of these Terms are available upon request by contacting us at contact@transparenta.eu.</li>
        </ul>

        <h3>Governing law</h3>
        <p>Romanian law and applicable EU law, including GDPR. Venue: Sibiu, Romania.</p>

        <h3>Contact</h3>
        <p>Contact us at contact@transparenta.eu. See also our <Link to="/privacy" className="underline">Privacy Policy</Link> and <Link to="/cookie-policy" className="underline">Cookie Policy</Link>.</p>
      </div>
    </div>
  )
}
