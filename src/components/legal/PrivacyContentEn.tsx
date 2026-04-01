export function PrivacyContentEn() {
  return (
    <div className="mx-auto w-full max-w-4xl p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">Effective Date: May 1, 2026 · Version: 3.0</p>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-medium">At a Glance</h2>
        <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
          <li>Local-first: charts and preferences are stored in your browser.</li>
          <li>Optional user accounts for newsletters, notifications, forum access, and AI research.</li>
          <li>Community forum integrated with your account; forum data stored in EU.</li>
          <li>Correspondence tools send emails from a platform address on your behalf.</li>
          <li>AI research features process only public data (opt-in).</li>
          <li>Analytics and enhanced error reporting only with your consent.</li>
          <li>No selling of personal data.</li>
          <li>Basic security logs are kept for a short period to protect accounts.</li>
        </ul>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-medium">What changed in version 3.0</h2>
        <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
          <li>Added forum data collection and processing disclosures (Discourse integration).</li>
          <li>Added correspondence data collection for platform-sent emails to institutions.</li>
          <li>Added AI research data processing disclosures.</li>
          <li>Added Discourse as a data sub-processor.</li>
          <li>Expanded notification consent to cover all new notification types.</li>
          <li>Updated data retention schedule for forum, correspondence, and AI data.</li>
          <li>Strengthened notification procedure for material policy changes.</li>
        </ul>
      </div>

      <div className="prose prose-slate dark:prose-invert max-w-none">
        <h3>Who we are</h3>
        <p>Controller: Claudiu Constantin Bogdan, persoana fizica. Contact: contact@transparenta.eu</p>
        <p>For campaign-specific data processing (such as the "Cu ochii pe bugetele locale" civic challenge), Funky Citizens acts as the data controller and Transparenta.eu acts as the data processor under an Article 28 GDPR data processing agreement. See the campaign-specific terms and conditions for details.</p>

        <h3>What personal data we collect</h3>
        <p>We collect different types of information depending on how you use our Service:</p>

        <h4>Data collected without an account:</h4>
        <ul>
          <li><strong>Essential Technical Data:</strong> Browser type, device type, IP address (anonymized), and general location (country level) for security and service provision (legitimate interests under GDPR Art. 6(1)(f)).</li>
          <li><strong>Consent Preferences:</strong> Your cookie and analytics consent choices stored in browser localStorage.</li>
          <li><strong>Local Storage Data:</strong> Charts, annotations, filters, and preferences stored locally in your browser. This data never leaves your device unless you explicitly export it.</li>
          <li><strong>Usage Analytics (opt-in):</strong> If you consent, we collect custom usage events via PostHog to understand how features are used. No autocapture or session recordings.</li>
          <li><strong>Error Reports (opt-in):</strong> If you consent, enhanced error context via Sentry to help us fix bugs. Without consent, only minimal error telemetry is collected.</li>
          <li><strong>Server Access Logs:</strong> IP address, user agent, requested URL, referrer, and timestamp to detect abuse, ensure reliability, and secure the Service (legitimate interests under GDPR Art. 6(1)(f)).</li>
        </ul>

        <h4>Data collected with an account:</h4>
        <ul>
          <li><strong>Account Information:</strong> User ID (assigned by Clerk), email address, first name, last name. Legal basis: GDPR Art. 6(1)(b) (performance of contract) and Art. 6(1)(a) (consent for notifications).</li>
          <li><strong>Authentication Data:</strong> Login timestamps, login IP address, device details (e.g., user agent), authentication tokens (managed by Clerk), and session information for account security.</li>
          <li><strong>Notification Preferences:</strong> Your subscription choices for all notification types (budget reports, campaign updates, platform updates, AI research alerts, data alerts), including which entities you follow and notification types you have enabled.</li>
          <li><strong>Notification History:</strong> Records of notifications sent to you, including delivery status and unsubscribe actions, for compliance and delivery optimization.</li>
          <li><strong>Terms Acceptance Records:</strong> The version of Terms of Use and Privacy Policy you accepted, the timestamp of acceptance, and associated metadata, for compliance with GDPR Art. 7(1) requirements to demonstrate consent.</li>
        </ul>

        <h4>Data collected through the forum:</h4>
        <ul>
          <li><strong>Forum Profile:</strong> Your user ID, email address, and display name are transmitted to the Discourse forum via DiscourseConnect SSO when you access the forum. The forum may store additional profile information you choose to provide.</li>
          <li><strong>Forum Activity:</strong> Posts, replies, likes, bookmarks, reading history, topic tracking preferences, and participation metrics. This data is stored by the Discourse forum system.</li>
          <li><strong>Forum Moderation Data:</strong> IP addresses, user agent, and timestamps associated with forum actions, retained for content moderation and abuse prevention (legitimate interests under GDPR Art. 6(1)(f)).</li>
          <li><strong>Forum Notifications:</strong> Your forum notification preferences (email digests, reply notifications, mention alerts) are managed within the Discourse system separately from platform notification preferences.</li>
        </ul>

        <h4>Data collected through correspondence tools:</h4>
        <ul>
          <li><strong>Correspondence Records:</strong> When you send an email to a public institution through the platform, we store the recipient institution, date, subject, email content, and delivery status. Legal basis: GDPR Art. 6(1)(b) (contract performance, as you requested the service) and Art. 6(1)(f) (legitimate interests for compliance record-keeping).</li>
          <li><strong>Sender Information:</strong> Your name and, where applicable, the authorization to send under the umbrella of Funky Citizens. This information is disclosed to the recipient institution in the email body.</li>
        </ul>

        <h4>Data collected through AI-powered features:</h4>
        <ul>
          <li><strong>AI Research Preferences:</strong> The entities you have opted in to monitor via AI research agents, and your alert configuration preferences. Legal basis: GDPR Art. 6(1)(a) (explicit consent).</li>
          <li><strong>AI Research Results:</strong> The findings generated by AI agents for entities you follow. These are derived exclusively from publicly available data and do not contain your personal data as input.</li>
        </ul>

        <h3>How we use your data</h3>
        <ul>
          <li><strong>Service Provision:</strong> To operate the Service, provide visualizations, and ensure platform security (legitimate interests, GDPR Art. 6(1)(f)).</li>
          <li><strong>Account Management:</strong> To create and maintain your account, authenticate access, and provide account-related support (contract performance, GDPR Art. 6(1)(b)).</li>
          <li><strong>Notification Delivery:</strong> To send you budget execution updates, campaign notifications, platform updates, AI research alerts, and data alerts that you have explicitly subscribed to (consent, GDPR Art. 6(1)(a)). You can withdraw consent and unsubscribe at any time.</li>
          <li><strong>Forum Operation:</strong> To operate the community forum, authenticate your access via SSO, display your contributions, and moderate content (contract performance, GDPR Art. 6(1)(b), and legitimate interests, GDPR Art. 6(1)(f)).</li>
          <li><strong>Correspondence Facilitation:</strong> To send emails to public institutions on your behalf when you use the correspondence tools (contract performance, GDPR Art. 6(1)(b), as you initiated the action).</li>
          <li><strong>AI Research:</strong> To perform proactive AI-powered research on entities you follow and deliver research findings to you (consent, GDPR Art. 6(1)(a)).</li>
          <li><strong>Communication:</strong> To send essential account-related communications (e.g., security alerts, terms updates) as necessary for contract performance and legitimate interests.</li>
          <li><strong>Analytics and Improvement:</strong> With your consent, to understand usage patterns and improve the Service (consent, GDPR Art. 6(1)(a)).</li>
          <li><strong>Error Detection and Resolution:</strong> With your consent, to identify and fix technical issues (consent, GDPR Art. 6(1)(a)).</li>
        </ul>

        <h3>Legal bases for processing</h3>
        <ul>
          <li><strong>Legitimate Interests (Art. 6(1)(f)):</strong> Operating and securing the Service, preventing fraud and abuse, forum moderation, correspondence compliance record-keeping.</li>
          <li><strong>Contract Performance (Art. 6(1)(b)):</strong> Providing account features and services you have requested, including forum access and correspondence sending.</li>
          <li><strong>Consent (Art. 6(1)(a)):</strong> Budget report subscriptions, campaign update notifications, platform update notifications, AI research alerts, data alerts, forum email digests, analytics, and enhanced error reporting. You may withdraw consent at any time.</li>
          <li><strong>Legal Obligations (Art. 6(1)(c)):</strong> Compliance with applicable laws and regulations, including correspondence archival requirements.</li>
        </ul>

        <h3>Notifications and communications consent</h3>
        <ul>
          <li><strong>Granular Opt-In:</strong> Each notification type is separately opt-in. We only send you a given type of notification if you explicitly subscribe to it. You are never required to subscribe to any notification type to use the Service.</li>
          <li><strong>Notification Categories:</strong> Budget reports (monthly, quarterly, annual) for entities you follow. Campaign updates for campaigns you participate in. Platform updates about new features and changes. AI research alerts for proactive agent findings. Data alerts for dataset condition monitoring. Forum notifications for replies, mentions, and digests (managed through forum settings).</li>
          <li><strong>Unsubscribe:</strong> You can unsubscribe from any notification type at any time by clicking the unsubscribe link in any email, managing your preferences in your account settings or forum settings, or contacting us at contact@transparenta.eu.</li>
          <li><strong>No Bundled Consent:</strong> We do not condition access to the Service or any feature on accepting all notification types. Each consent is independent.</li>
          <li><strong>No Marketing:</strong> We do not send promotional or marketing emails. All communications are informational updates you have requested or essential account communications.</li>
          <li><strong>No Sharing:</strong> We never sell, rent, or share your email address with third parties for their marketing purposes.</li>
        </ul>

        <h3>Data sources and licensing</h3>
        <p>Public sector information from Ministerul Finanțelor. No government affiliation.</p>

        <h3>Data sharing and processors</h3>
        <p>We share data with the following trusted service providers who process data on our behalf:</p>
        <ul>
          <li><strong>Clerk (Authentication):</strong> Manages user authentication and account data. EU/US with standard contractual clauses.</li>
          <li><strong>Discourse (Community Forum):</strong> Self-hosted Discourse instance within the European Union. Processes forum profile data, posts, and activity via DiscourseConnect SSO. Data remains within the EU.</li>
          <li><strong>PostHog (Analytics):</strong> Processes usage analytics if you consent. EU-hosted option available.</li>
          <li><strong>Sentry (Error Reporting):</strong> Processes error logs if you consent. EU-first with data residency controls.</li>
          <li><strong>Email Service Provider:</strong> Delivers notifications, newsletters, and correspondence emails you have initiated.</li>
          <li><strong>Hosting Providers:</strong> Store and serve application data and databases within the EU.</li>
        </ul>
        <p>All processors are bound by data protection agreements and GDPR-compliant safeguards, including standard contractual clauses for international transfers where applicable.</p>
        <p>When you send correspondence to a public institution through the platform, the email content (including your name as identified in the email body) is transmitted to the recipient institution. Public institutions are independent data controllers for any personal data they receive.</p>

        <h3>Data retention</h3>
        <ul>
          <li><strong>LocalStorage:</strong> Stored in your browser until you clear it manually.</li>
          <li><strong>Account Data:</strong> Retained for as long as your account is active or as needed to provide services. Deleted within 90 days of account deletion request.</li>
          <li><strong>Notification Subscriptions:</strong> Retained while active. Soft-deleted (marked inactive) when you unsubscribe, with full deletion after 1 year for compliance and anti-spam purposes.</li>
          <li><strong>Newsletter and Notification Delivery Records:</strong> Retained for 2 years for delivery troubleshooting and compliance.</li>
          <li><strong>Terms Acceptance Records:</strong> Retained for the duration of your account and for 3 years after account deletion for compliance purposes.</li>
          <li><strong>Forum Data:</strong> Retained while your account is active. Posts and profile data are deleted within 90 days of account deletion. Anonymous posts are retained without any link to your identity.</li>
          <li><strong>Correspondence Records:</strong> Retained for 5 years for compliance with Romanian archival requirements for official correspondence. You may request earlier deletion by contacting us.</li>
          <li><strong>AI Research Results:</strong> Retained for 1 year, then automatically deleted. You may request earlier deletion at any time.</li>
          <li><strong>Analytics Data:</strong> Retained for 12 months, then automatically deleted or anonymized.</li>
          <li><strong>Error Logs:</strong> Retained for 90 days for debugging, then automatically deleted.</li>
          <li><strong>Server Access Logs:</strong> Retained for up to 90 days for security and reliability, then automatically deleted.</li>
        </ul>

        <h3>Your rights under GDPR</h3>
        <p>As a data subject under GDPR, you have the following rights:</p>
        <ul>
          <li><strong>Right of Access (Art. 15):</strong> Request a copy of the personal data we hold about you, including data stored in the forum system.</li>
          <li><strong>Right to Rectification (Art. 16):</strong> Request correction of inaccurate personal data.</li>
          <li><strong>Right to Erasure (Art. 17):</strong> Request deletion of your personal data ("right to be forgotten"), including forum data and correspondence records.</li>
          <li><strong>Right to Restriction (Art. 18):</strong> Request limitation of processing in certain circumstances.</li>
          <li><strong>Right to Data Portability (Art. 20):</strong> Receive your data in a structured, machine-readable format, including forum posts and correspondence records.</li>
          <li><strong>Right to Object (Art. 21):</strong> Object to processing based on legitimate interests, including forum moderation data processing.</li>
          <li><strong>Right to Withdraw Consent (Art. 7(3)):</strong> Withdraw consent for any notification type, AI research, analytics, or error reporting at any time without affecting the lawfulness of processing before withdrawal.</li>
          <li><strong>Right to Lodge a Complaint:</strong> File a complaint with the Romanian supervisory authority (ANSPDCP) at anspdcp.ro.</li>
        </ul>
        <p>To exercise any of these rights, contact us at contact@transparenta.eu. We will respond within 30 days. For rights related to campaign-specific data processed by Funky Citizens, contact weare@funky.ong.</p>

        <h3>Data security</h3>
        <ul>
          <li><strong>Encryption:</strong> Data in transit is encrypted using TLS/SSL. Data at rest is encrypted in our databases.</li>
          <li><strong>Access Controls:</strong> Strict access controls limit who can access personal data to authorized personnel only.</li>
          <li><strong>Authentication:</strong> Account access secured via Clerk with industry-standard security practices.</li>
          <li><strong>Forum Security:</strong> The Discourse forum instance is self-hosted within the EU with regular security updates and access controls.</li>
          <li><strong>Monitoring:</strong> Security monitoring and logging to detect and respond to potential breaches.</li>
        </ul>

        <h3>International data transfers</h3>
        <p>Some service providers may process data outside the EU/EEA. All transfers are protected by appropriate safeguards including:</p>
        <ul>
          <li>Standard Contractual Clauses (SCCs) approved by the European Commission</li>
          <li>Adequacy decisions where applicable</li>
          <li>Additional technical and organizational measures</li>
        </ul>
        <p>The Discourse forum instance is hosted entirely within the EU. No forum data is transferred outside the EU/EEA.</p>

        <h3>Automated decision-making</h3>
        <p>We do not use automated decision-making or profiling that produces legal effects or similarly significantly affects you. AI research agents provide informational findings only and do not make decisions about or on behalf of users.</p>

        <h3>Children's privacy</h3>
        <p>The Service is not directed to children under 16. We do not knowingly collect personal data from children under 16. If you believe we have collected data from a child under 16, please contact us immediately.</p>

        <h3>Changes to this policy</h3>
        <p>We may update this Privacy Policy from time to time to reflect changes in our practices, new features, or legal requirements.</p>
        <ul>
          <li><strong>Notification of Material Changes:</strong> For material changes, we will provide at least 30 days advance notice by publishing the updated policy with the future effective date and sending an email notification to registered account holders.</li>
          <li><strong>In-App Acceptance:</strong> After the effective date, you will be asked to review and acknowledge the updated policy on your next login.</li>
          <li><strong>Version History:</strong> Previous versions of this policy are available upon request by contacting us at contact@transparenta.eu.</li>
        </ul>

        <h3>Contact and data protection officer</h3>
        <p>For questions about this Privacy Policy, to exercise your rights, or to contact our data protection officer, email us at contact@transparenta.eu</p>

        <h3>Supervisory authority</h3>
        <p>Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP), B-dul G-ral. Gheorghe Magheru 28-30, Sector 1, București, Romania. Website: anspdcp.ro</p>
      </div>
    </div>
  )
}
