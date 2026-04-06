export function PrivacyContentEn() {
  return (
    <div className="mx-auto w-full max-w-4xl p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">Effective Date: April 6, 2026 · Version: 3.0</p>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-medium">At a Glance</h2>
        <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
          <li>Local-first: charts, learning progress, campaign progress, maps, alerts, and preferences may be stored in your browser.</li>
          <li>Optional user accounts for newsletters, notifications, forum access, and AI-enhanced features.</li>
          <li>Community forum integrated with your account; some areas may be public, while others may be restricted to signed-in users or enrolled participants depending on the relevant configuration.</li>
          <li>Correspondence tools may prepare, send, or help you send emails to public institutions, depending on the workflow.</li>
          <li>AI-enhanced or experimental features may process public data, public documents, and in some cases prompts or documents you choose to submit.</li>
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
          <li>Expanded AI data processing disclosures to cover AI-enhanced and experimental features, including document processing and user-submitted analysis inputs.</li>
          <li>Added Discourse as a data sub-processor.</li>
          <li>Expanded notification consent to cover all new notification types.</li>
          <li>Updated data retention schedule for forum, correspondence, and AI data.</li>
          <li>Strengthened notification procedure for material policy changes.</li>
        </ul>
      </div>

      <div className="prose prose-slate dark:prose-invert max-w-none">
        <h3>Who we are</h3>
        <p>Controller: Claudiu Constantin Bogdan, persoana fizica. Contact: contact@transparenta.eu</p>
        <p>Some campaigns, challenges, or partner-led activities made available through the Service may be subject to additional campaign-specific terms and privacy information. In such campaigns, Transparenta.eu and the relevant partner may act as separate controllers for different purposes. Those campaign-specific documents explain the split of responsibilities, the purposes for which each controller acts, and the relevant contact point for rights requests. Unless a campaign-specific document expressly states otherwise, Transparenta.eu remains the data controller for platform-level processing, including account creation and authentication, forum access and moderation, security and abuse prevention, cookie and consent management, notification infrastructure, and the operation, improvement, and development of the Service.</p>

        <h3>What personal data we collect</h3>
        <p>We collect different types of information depending on how you use our Service:</p>

        <h4>Data collected without an account:</h4>
        <ul>
          <li><strong>Essential Technical Data:</strong> Browser type, device type, and general location (country level) used for service delivery, reliability, and fraud prevention. Raw IP addresses are handled separately in server access logs and, where applicable, forum moderation logs for security and abuse prevention (legitimate interests under GDPR Art. 6(1)(f)).</li>
          <li><strong>Consent Preferences:</strong> Your cookie and analytics consent choices stored in browser localStorage.</li>
          <li><strong>Browser-Stored Data:</strong> Charts, chart categories, annotations, filters, alert drafts or saved alerts, recent entities, locale, theme, currency and inflation preferences, learning progress, campaign progress, onboarding state, and similar user preferences or drafts stored locally in your browser. Some of this data may remain only on your device; some may later be synchronized to our servers if you are signed in and use features that support sync.</li>
          <li><strong>IndexedDB and Session Storage Data:</strong> Certain advanced features, such as advanced map analytics drafts, local map snapshots, and temporary editor/runtime state, may use IndexedDB or sessionStorage in addition to localStorage.</li>
          <li><strong>Usage Analytics (opt-in):</strong> If you consent, we collect custom usage events via PostHog to understand how features are used. No autocapture or session recordings. Analytics processing is separate from raw server or forum security logs.</li>
          <li><strong>Error Reports (opt-in):</strong> If you consent, enhanced error context via Sentry to help us fix bugs. If you choose to send feedback or bug reports through Sentry-powered forms, your message text, optional screenshots, and related technical context may be processed. Without consent, only minimal error telemetry is collected.</li>
          <li><strong>Server Access Logs:</strong> Full IP address, user agent, requested URL, referrer, and timestamp to detect abuse, ensure reliability, and secure the Service (legitimate interests under GDPR Art. 6(1)(f)).</li>
        </ul>

        <h4>Data collected with an account:</h4>
        <ul>
          <li><strong>Account Information:</strong> User ID (assigned by Clerk), email address, first name, last name. Legal basis: GDPR Art. 6(1)(b) (performance of contract) and Art. 6(1)(a) (consent for notifications).</li>
          <li><strong>Authentication Data:</strong> Login timestamps, login IP address, device details (e.g., user agent), authentication tokens (managed by Clerk), and session information for account security.</li>
          <li><strong>Notification Preferences:</strong> Your subscription choices for optional notification types (such as budget reports, campaign updates, platform updates, AI research alerts, and data alerts), including which entities you follow, which notification types you have enabled, and any campaign update preferences activated by default when you join a campaign or accept campaign-specific terms for a given entity.</li>
          <li><strong>Communication History:</strong> Records of service-related communications and optional notifications sent to you, including delivery status and unsubscribe actions where applicable, for compliance, delivery troubleshooting, and service administration.</li>
          <li><strong>Terms and Policy Acknowledgement Records:</strong> Where implemented in the relevant flow, we may store records showing when you acknowledged or accepted applicable terms, policies, or campaign-specific conditions, together with related metadata needed for compliance and service administration.</li>
          <li><strong>Synced Learning and Campaign Data:</strong> If you are signed in and use synced learning or campaign features, we may store your learning progress, challenge progress, accepted campaign terms by entity, selected entities, onboarding state, interaction records, audit events, review outcomes, submitted values, and related source URLs or metadata required to operate those features across sessions and devices.</li>
          <li><strong>User-Created Map and Sharing Data:</strong> If you use advanced map analytics or similar user-generated features, we may store map titles, descriptions, visibility state, snapshots, public sharing identifiers, and configuration state needed to save, restore, or publish those outputs.</li>
        </ul>

        <h4>Data collected through the forum:</h4>
        <ul>
          <li><strong>Forum Profile:</strong> Your user ID, email address, and display name or username are transmitted to the Discourse forum via DiscourseConnect SSO when you access the forum. The forum may store additional profile information you choose to provide, including location or time zone.</li>
          <li><strong>Forum Activity:</strong> Questions, comments, posts, replies, likes, bookmarks, reading history, topic tracking preferences, participation metrics, and discussions connected to platform features, lessons, campaigns, or partner-led activities. Visibility depends on the relevant forum area: some contributions may be public, while others may be visible only to signed-in users or enrolled participants.</li>
          <li><strong>Anonymous or Pseudonymous Forum Use:</strong> If you use anonymous mode or a similar pseudonymous forum feature, the forum may display your contributions without visible identification or under an alternate public identity. In certain campaign spaces or similar integrations, this may also hide your identity from relevant partner teams, but the forum system and platform operators may still retain technical or account linkage necessary for moderation, abuse prevention, security, and legal compliance.</li>
          <li><strong>Forum Moderation Data:</strong> Full IP addresses, user agent, timestamps associated with forum actions, moderation reports, and related technical metadata, retained for content moderation, abuse prevention, and legal compliance (legitimate interests under GDPR Art. 6(1)(f)).</li>
          <li><strong>Forum Notifications:</strong> Your forum notification preferences (email digests, reply notifications, mention alerts) are managed within the Discourse system separately from platform notification preferences.</li>
        </ul>

        <h4>Data collected through correspondence tools:</h4>
        <ul>
          <li><strong>Correspondence Records:</strong> When you use the platform to prepare, send, copy, or track an email to a public institution, we may store the recipient institution, date, subject, message content, delivery status, thread identifiers, message IDs, and related technical metadata. Legal basis: GDPR Art. 6(1)(b) (contract performance, as you requested the service) and Art. 6(1)(f) (legitimate interests for compliance, service administration, and thread tracking).</li>
          <li><strong>Copies and Replies:</strong> If a correspondence workflow uses a platform-controlled CC address, reply-tracking address, or other capture mechanism, we may receive and store a copy of the sent email and any replies routed back through the tracked thread, together with related metadata and review notes.</li>
          <li><strong>Sender Information:</strong> Your name, organization details, and, where applicable, any representation that a message is sent under the umbrella of a campaign partner or organization. This information may be disclosed to the recipient institution in the message itself.</li>
        </ul>

        <h4>Data collected through AI-powered features:</h4>
        <ul>
          <li><strong>AI Feature Preferences:</strong> Your settings, activation choices, monitored entities, and alert configuration preferences for AI-enhanced or experimental features. Legal basis may include GDPR Art. 6(1)(a) (consent) and/or Art. 6(1)(b) (performance of a requested service), depending on the feature.</li>
          <li><strong>AI Inputs:</strong> Public data, public documents, forum posts, campaign submissions, prompts, questions, uploaded or submitted files, extracted text, and other inputs you choose to provide to an AI-enhanced feature, or that the relevant feature may lawfully use for analysis, if that feature accepts such content.</li>
          <li><strong>AI Outputs and Derivatives:</strong> Findings, summaries, classifications, extracted structured data, draft text, answers, prioritization results, duplicate-content signals, annotations, or other outputs generated or assisted by AI systems in response to the relevant input.</li>
          <li><strong>Data Processed for AI-Assisted Moderation and Review:</strong> Where such functionality is enabled, automated systems may process forum posts, reports, campaign submissions, user-submitted materials, and analyzed public documents for classification, summarization, duplicate-content detection, prioritization, moderation support, or review.</li>
          <li><strong>AI Feature Logs and Feedback:</strong> Technical logs, usage metadata, error reports, and feedback related to AI-enhanced features, to operate, secure, review, improve, and troubleshoot those features.</li>
        </ul>

        <h3>How we use your data</h3>
        <ul>
          <li><strong>Service Provision:</strong> To operate the Service, provide visualizations, and ensure platform security (legitimate interests, GDPR Art. 6(1)(f)).</li>
          <li><strong>Account Management:</strong> To create and maintain your account, authenticate access, and provide account-related support (contract performance, GDPR Art. 6(1)(b)).</li>
          <li><strong>Notification Delivery:</strong> To send you optional budget execution updates, campaign notifications, platform updates, AI research alerts, and data alerts that you have enabled, explicitly subscribed to, or activated through a campaign participation flow where such updates are clearly disclosed as enabled by default before you complete the relevant join or acceptance action (consent, GDPR Art. 6(1)(a)). You can withdraw consent and unsubscribe at any time.</li>
          <li><strong>Forum Operation:</strong> To operate the community forum, authenticate your access via SSO, display your contributions according to the visibility rules of the relevant area, and moderate content (contract performance, GDPR Art. 6(1)(b), and legitimate interests, GDPR Art. 6(1)(f)).</li>
          <li><strong>Correspondence Facilitation:</strong> To prepare emails for your own email client, send emails on your behalf where that workflow applies, capture copies or replies through tracked correspondence channels, and maintain correspondence threads when you use the correspondence tools (contract performance, GDPR Art. 6(1)(b), as you initiated the action).</li>
          <li><strong>AI-Enhanced Features:</strong> To operate AI-enhanced or experimental features you choose to use, including public-data analysis, document processing, extraction, summarization, classification, draft generation, duplicate-content detection, prioritization, moderation or review support, research assistance, and proactive AI-powered monitoring where enabled (consent and/or contract performance, depending on the feature).</li>
          <li><strong>Communication:</strong> To send essential or service-related communications such as account verification, security alerts, transactional welcome emails, confirmations of requested actions, campaign participation or subscription confirmations, and terms or policy updates, as necessary for contract performance and legitimate interests.</li>
          <li><strong>Analytics and Improvement:</strong> With your consent, to understand usage patterns and improve the Service (consent, GDPR Art. 6(1)(a)).</li>
          <li><strong>Error Detection and Resolution:</strong> With your consent, to identify and fix technical issues (consent, GDPR Art. 6(1)(a)).</li>
        </ul>

        <h3>Legal bases for processing</h3>
        <ul>
          <li><strong>Legitimate Interests (Art. 6(1)(f)):</strong> Operating and securing the Service, preventing fraud and abuse, forum moderation, AI-assisted classification, summarization, duplicate-content detection, prioritization, and review of forum, campaign, or public-source materials, investigating abusive use of correspondence tools or AI features, correspondence compliance record-keeping, thread tracking, and review of institutional replies.</li>
          <li><strong>Contract Performance (Art. 6(1)(b)):</strong> Providing account features and services you have requested, including forum access and correspondence sending.</li>
          <li><strong>Consent (Art. 6(1)(a)):</strong> Optional budget report subscriptions, recurring campaign update notifications, platform update notifications, AI alerts, certain AI-enhanced or experimental processing where consent is the appropriate legal basis, data alerts, forum email digests, analytics, and enhanced error reporting, including campaign update preferences activated by default through clearly disclosed campaign join flows. You may withdraw consent at any time.</li>
          <li><strong>Legal Obligations (Art. 6(1)(c)):</strong> Compliance with applicable laws and regulations.</li>
        </ul>

        <h3>Notifications and communications consent</h3>
        <ul>
          <li><strong>Service Communications:</strong> Certain emails are sent because they are necessary to operate the Service or confirm an action you requested. These may include account verification and security emails, transactional welcome emails, legal notices, unsubscribe confirmations, campaign participation confirmations, and confirmations related to notification preferences or other user-requested actions.</li>
          <li><strong>Granular Activation for Optional Notifications:</strong> Each optional notification type is separately opt-in or otherwise user-activated through the relevant settings or campaign preference flow. In some campaigns, recurring campaign updates may be activated by default when you join the campaign or accept campaign-specific terms for a particular entity, provided that this default activation is clearly disclosed before you complete the relevant action and you can disable those updates at any time. You are never required to enable all optional notification types to use the Service.</li>
          <li><strong>Optional Notification Categories:</strong> Budget reports (monthly, quarterly, annual) for entities you follow. Recurring campaign updates for campaigns you participate in. Platform updates about new features and non-essential changes. AI alerts for proactive or AI-assisted findings where offered. Data alerts for dataset condition monitoring. Forum notifications for replies, mentions, and digests (managed through forum settings). We may add future optional notification categories through updated settings or activation flows.</li>
          <li><strong>Unsubscribe:</strong> You can unsubscribe from optional notification types at any time by clicking the unsubscribe link in the relevant email, managing your preferences in your account settings or forum settings, or contacting us at contact@transparenta.eu. Essential or service-related communications may still be sent where necessary.</li>
          <li><strong>No Bundled Consent:</strong> We do not condition access to the Service or any feature on accepting all optional notification types. Each consent is independent.</li>
          <li><strong>No Marketing:</strong> We do not send third-party marketing emails. Communications sent by us are either service-related communications or informational updates that you have enabled or requested.</li>
          <li><strong>No Sharing:</strong> We never sell, rent, or share your email address with third parties for their marketing purposes.</li>
        </ul>

        <h3>Data sources and licensing</h3>
        <p>Public sector information from Ministerul Finanțelor. No government affiliation.</p>

        <h3>Data sharing, processors, and separate controllers</h3>
        <p>We share data with the following trusted service providers who process data on our behalf:</p>
        <ul>
          <li><strong>Clerk (Authentication):</strong> Manages user authentication and account data. EU/US with standard contractual clauses.</li>
          <li><strong>Discourse (Community Forum):</strong> Self-hosted Discourse instance within the European Union. Processes forum profile data, posts, and activity via DiscourseConnect SSO. Data remains within the EU.</li>
          <li><strong>PostHog (Analytics):</strong> Processes usage analytics if you consent. EU-hosted option available.</li>
          <li><strong>Sentry (Error Reporting):</strong> Processes error logs if you consent. EU-first with data residency controls.</li>
          <li><strong>AI and Document Processing Providers:</strong> If and when AI-enhanced or experimental features are enabled, we may use self-hosted or third-party AI, document processing, OCR, extraction, classification, or summarization providers to process the inputs and outputs required by those features. Depending on the provider and configuration, submitted inputs and outputs may also be retained by that provider and may be used for service improvement, model development, or training.</li>
          <li><strong>Email Service Provider:</strong> Delivers notifications, newsletters, and correspondence emails you have initiated.</li>
          <li><strong>Hosting Providers:</strong> Store and serve application data and databases in infrastructure selected by us or our providers, which may include EU-based hosting depending on the service and deployment.</li>
        </ul>
        <p>All processors are bound by data protection agreements and GDPR-compliant safeguards, including standard contractual clauses for international transfers where applicable.</p>
        <p>Where a feature uses a third-party AI or document-processing provider, we will identify that provider in the relevant feature notice or in a separately maintained sub-processor list we make available. Unless the relevant feature notice states otherwise, you should assume that a third-party AI provider may retain submitted inputs or outputs and may use them for service improvement, model development, or training.</p>
        <p>When you send or prepare correspondence to a public institution through the platform, the email content and sender information included in that correspondence are transmitted to the recipient institution and, where the workflow uses CC, reply tracking, or capture addresses, may also be processed through those monitored channels. Public institutions are independent data controllers for any personal data they receive.</p>
        <p>Campaign partners identified in campaign-specific notices act as separate controllers for their own campaign purposes, not as processors acting solely on our behalf for all campaign-related processing.</p>
        <p>If you exercise your right to erasure with us, we can delete or anonymize data within systems we control, subject to legal exceptions. We cannot delete emails, attachments, replies, or other records already delivered to a public institution, campaign partner, or other independent controller, and we cannot require those independent controllers to delete records held in their own systems.</p>
        <p>We may also preserve, review, and disclose personal data where required by law, court order, subpoena, lawful authority request, or where reasonably necessary to investigate illegal or abusive conduct, protect rights or safety, or enforce our Terms.</p>

        <h3>Data retention</h3>
        <ul>
          <li><strong>LocalStorage, sessionStorage, and IndexedDB:</strong> Browser-stored data remains on your device until you clear it, the relevant feature overwrites it, or the browser removes it. Some locally stored data may also be synchronized to our servers if you are signed in and use synced features.</li>
          <li><strong>Account Data:</strong> Retained for as long as your account is active or as needed to provide services, and deleted or anonymized within 30 days after account deletion or account closure, except for data retained under the more specific periods below or where a longer retention period is required by law, security, dispute handling, or compliance.</li>
          <li><strong>Notification Subscriptions:</strong> Retained while active. Soft-deleted (marked inactive) when you unsubscribe, with full deletion after 1 year for compliance and anti-spam purposes.</li>
          <li><strong>Newsletter and Notification Delivery Records:</strong> Retained for 2 years for delivery troubleshooting and compliance.</li>
          <li><strong>Terms and Policy Acknowledgement Records:</strong> Where maintained, retained for 3 years after the relevant acknowledgement or the end of the applicable service or campaign relationship, whichever is later.</li>
          <li><strong>Learning and Campaign Progress:</strong> Retained for as long as needed to provide synced progress, review workflows, campaign participation features, and related audit history, unless deletion is requested and retention is not otherwise required.</li>
          <li><strong>User-Created Maps and Snapshots:</strong> Retained for as long as needed to provide the map feature, including any public or private saved versions, unless you delete them earlier or request deletion where available.</li>
          <li><strong>Forum Data:</strong> Retained for as long as needed to operate the forum, preserve discussion integrity, administer accounts, and handle moderation, abuse prevention, legal compliance, or user deletion requests. The exact treatment of posts in public or restricted areas, profile data, anonymized content, and moderation records may depend on forum settings, moderation needs, and applicable law.</li>
          <li><strong>Correspondence Records:</strong> Retained for 5 years, unless deletion is required earlier by applicable law or the relevant data is lawfully deleted sooner. You may request deletion where legally available.</li>
          <li><strong>AI Inputs, Outputs, and Feature Logs:</strong> Retained by us for 5 years, unless a shorter retention period is expressly stated in the relevant feature flow or deletion is required earlier by applicable law. Third-party AI providers used for a feature may apply their own retention and training practices.</li>
          <li><strong>Analytics Data:</strong> Retained for 12 months, then automatically deleted or anonymized.</li>
          <li><strong>Error Logs and Feedback Reports:</strong> Retained for 180 days, unless applicable law requires a longer retention period.</li>
          <li><strong>Server Access Logs:</strong> Retained for 90 days, unless applicable law or a specific security, abuse, or legal incident requires longer preservation.</li>
        </ul>

        <h3>Your rights under GDPR</h3>
        <p>As a data subject under GDPR, you have the following rights:</p>
        <ul>
          <li><strong>Right of Access (Art. 15):</strong> Request a copy of the personal data we hold about you, including data stored in the forum system.</li>
          <li><strong>Right to Rectification (Art. 16):</strong> Request correction of inaccurate personal data.</li>
          <li><strong>Right to Erasure (Art. 17):</strong> Request deletion of personal data we control ("right to be forgotten"), including forum data and correspondence records, subject to legal exceptions and the independent-controller limits described above.</li>
          <li><strong>Right to Restriction (Art. 18):</strong> Request limitation of processing in certain circumstances.</li>
          <li><strong>Right to Data Portability (Art. 20):</strong> Receive your data in a structured, machine-readable format, including forum posts and correspondence records.</li>
          <li><strong>Right to Object (Art. 21):</strong> Object to processing based on legitimate interests, including forum moderation data processing.</li>
          <li><strong>Right to Withdraw Consent (Art. 7(3)):</strong> Withdraw consent for any notification type, AI research, analytics, or error reporting at any time without affecting the lawfulness of processing before withdrawal.</li>
          <li><strong>Right to Lodge a Complaint:</strong> File a complaint with the Romanian supervisory authority (ANSPDCP) at anspdcp.ro.</li>
        </ul>
        <p>To exercise any of these rights, contact us at contact@transparenta.eu. We will respond within 30 days. If your request concerns campaign-specific processing carried out by a campaign partner for its own purposes, or correspondence already delivered to a public institution or another independent controller, you may also need to contact that controller directly.</p>

        <h3>Data security</h3>
        <ul>
          <li><strong>Encryption in Transit:</strong> We use HTTPS/TLS or comparable protections for data transmitted between your browser and our services where available.</li>
          <li><strong>Access Controls:</strong> We use reasonable technical and organizational measures, including access controls, to limit access to personal data to persons who need it for legitimate operational purposes.</li>
          <li><strong>Authentication:</strong> Account access is handled through Clerk or another configured authentication provider with its own security measures and operational controls.</li>
          <li><strong>Forum Security:</strong> The Discourse forum instance is operated with administrative, access, and maintenance controls appropriate to the service as configured at the relevant time.</li>
          <li><strong>Monitoring:</strong> We may use logging, monitoring, and incident-response measures to detect, investigate, and respond to security or reliability issues.</li>
        </ul>

        <h3>International data transfers</h3>
        <p>Some service providers may process data outside the EU/EEA. All transfers are protected by appropriate safeguards including:</p>
        <ul>
          <li>Standard Contractual Clauses (SCCs) approved by the European Commission</li>
          <li>Adequacy decisions where applicable</li>
          <li>Additional technical and organizational measures</li>
        </ul>
        <p>Where we operate or configure the Discourse forum to use EU-based hosting, forum data is intended to remain within the EU/EEA except where access, support, backup, vendor operations, or other lawful transfer mechanisms make an international transfer necessary and permitted.</p>

        <h3>Automated decision-making</h3>
        <p>We do not use automated decision-making or profiling that produces legal effects or similarly significantly affects you. AI-enhanced features provide informational or assistive outputs only and do not make binding decisions about or on behalf of users.</p>

        <h3>Children's privacy</h3>
        <p>The Service is intended for persons aged 16 or older. We do not knowingly offer accounts or services to persons under 16. Certain features involving official correspondence or documents may be reserved for persons aged 18 or older. If you believe we have collected personal data from a person below the applicable minimum age, please contact us immediately.</p>

        <h3>Changes to this policy</h3>
        <p>We may update this Privacy Policy from time to time to reflect changes in our practices, new features, or legal requirements.</p>
        <ul>
          <li><strong>Notification of Material Changes:</strong> For material changes, we will provide at least 30 days advance notice by publishing the updated policy with the future effective date and sending an email notification to registered account holders.</li>
          <li><strong>In-App Acceptance:</strong> After the effective date, you will be asked to review and acknowledge the updated policy on your next login.</li>
          <li><strong>Version History:</strong> Previous versions of this policy are available upon request by contacting us at contact@transparenta.eu.</li>
        </ul>

        <h3>Contact</h3>
        <p>For questions about this Privacy Policy or to exercise your rights, email us at contact@transparenta.eu</p>

        <h3>Supervisory authority</h3>
        <p>Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP), B-dul G-ral. Gheorghe Magheru 28-30, Sector 1, București, Romania. Website: anspdcp.ro</p>
      </div>
    </div>
  )
}
