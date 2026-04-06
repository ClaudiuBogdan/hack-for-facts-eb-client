import { Link } from '@tanstack/react-router'

export function TermsContentEn() {
  return (
    <div className="mx-auto w-full max-w-4xl p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Terms of Use</h1>
        <p className="text-sm text-muted-foreground">Effective Date: April 6, 2026 · Version: 3.0</p>
        <p className="text-sm text-muted-foreground">Provider: Claudiu Constantin Bogdan, individual operator of Transparenta.eu. Contact: contact@transparenta.eu</p>
      </div>

        <div className="space-y-2">
          <h2 className="text-lg font-medium">At a Glance</h2>
          <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
            <li>Informational purposes only; no warranties.</li>
            <li>Independent project; no government affiliation.</li>
            <li>When sharing charts, maps, or similar visual outputs generated through the Service, include visible attribution to the data source and Transparenta.eu.</li>
            <li>Optional user accounts for enhanced features like newsletters, notifications, forum access, and AI research.</li>
            <li>Community forum for civic discussion, integrated with your platform account.</li>
            <li>Tools to contact public institutions on your behalf (opt-in, per action).</li>
            <li>AI-enhanced or experimental features may assist with public-data analysis, document processing, summarization, extraction, and research (some opt-in).</li>
          </ul>
        </div>

      <div className="space-y-2">
          <h2 className="text-lg font-medium">What changed in version 3.1</h2>
          <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
            <li>Added Community Forum section covering Discourse integration and forum rules.</li>
            <li>Added Correspondence with Public Institutions section for platform-sent emails.</li>
            <li>Expanded the AI-Powered Features section to cover AI-enhanced and experimental features, including public-data and document processing.</li>
            <li>Expanded notification types beyond budget reports to include platform updates and campaign alerts.</li>
            <li>Updated data storage and retention to cover forum, correspondence, and AI data.</li>
            <li>Strengthened notification procedure for future terms updates.</li>
          </ul>
        </div>

      <div className="prose prose-slate dark:prose-invert max-w-none">
        <h3>Acceptance</h3>
        <p>By using the Service, you agree to these Terms. If you disagree, please do not use the Service.</p>
        <p>Your use of the Service is also governed by our <Link to="/privacy" className="underline">Privacy Policy</Link> and <Link to="/cookie-policy" className="underline">Cookie Policy</Link>, which describe how we process personal data, including security logs, authentication data, and your communication preferences.</p>

        <h3>Provider information and online contracting</h3>
        <ul>
          <li><strong>Provider:</strong> Transparenta.eu is operated by Claudiu Constantin Bogdan, as an individual. Contact: contact@transparenta.eu.</li>
          <li><strong>Contract Formation:</strong> For general browsing, these Terms apply when you access or use the Service. For account-based, notification, forum, correspondence, campaign, or AI features that require a confirmation step, the relevant contractual relationship is formed when you complete the sign-up, activation, submission, or acceptance step presented in the interface.</li>
          <li><strong>Contract Languages:</strong> These Terms may be made available in Romanian and English.</li>
          <li><strong>Technical Steps and Error Correction:</strong> Before creating an account or activating a feature, you can review the relevant disclosures in the interface and correct form fields, notification settings, correspondence content, or other inputs before final submission or confirmation.</li>
          <li><strong>Storage and Access:</strong> The current Terms are published on the Service and can be saved or printed from your browser. Previous versions are available on request. Where implemented in the relevant flow, we may also store records of the version you accepted and the time of acceptance.</li>
          <li><strong>Consumer Rights:</strong> Nothing in these Terms limits any mandatory consumer rights that may apply to digital content or digital services offered through the Service.</li>
        </ul>

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
          <li><strong>Minimum Age:</strong> The Service may only be used by persons aged 16 or older. Certain features or workflows, including those involving correspondence or official documents sent to public authorities or other legally significant actions, may require a minimum age of 18. By creating an account or using a feature, you represent that you meet the age requirement applicable to that feature.</li>
          <li><strong>Account Creation:</strong> When you create an account, you may be asked to provide certain information such as your email address and name. You are responsible for maintaining the confidentiality of your account credentials.</li>
          <li><strong>Third-Party Authentication:</strong> We use Clerk for authentication services. By creating an account, you also agree to Clerk's terms of service.</li>
          <li><strong>Unified Account:</strong> Your account provides access to all platform features, including the community forum hosted on Discourse. When you access the forum, your user ID, email address, and display name are shared with the forum system via single sign-on (SSO). The forum may store additional data such as your posts, profile information, and activity logs.</li>
          <li><strong>Account Termination:</strong> You may delete your account at any time. Deleting your account removes your account access, including forum access, but forum profile data, posts, moderation records, backups, and related content may be deleted, anonymized, or retained where legally or technically necessary, as described in these Terms and the Privacy Policy. We may suspend or terminate accounts that violate these Terms or applicable law.</li>
        </ul>

        <h3>Notifications and communications</h3>
        <ul>
          <li><strong>Two Categories of Email Communication:</strong> We may send (i) essential or service-related communications that are necessary to operate the Service or confirm an action you requested, and (ii) optional notifications that you choose to receive.</li>
          <li><strong>Essential or Service-Related Communications:</strong> These may include account verification, sign-in or security messages, transactional welcome emails, legal or policy notices, unsubscribe confirmations, confirmations related to your account or notification settings, and one-time campaign participation or subscription confirmation emails connected to an action you requested. These communications are not promotional marketing and do not depend on a separate notification opt-in.</li>
          <li><strong>Budget Reports:</strong> Optional monthly, quarterly, or annual budget execution reports for entities you follow.</li>
          <li><strong>Campaign Updates:</strong> Optional recurring notifications about civic campaigns you participate in, including public debate correspondence updates and campaign-related milestones. In some campaign flows, these updates may be activated by default when you join the campaign or accept campaign-specific terms for a given entity, provided the relevant join or acceptance interface clearly discloses that activation before you complete the action, identifies the relevant campaign or entity, and explains how you can turn those updates off at any time.</li>
          <li><strong>Platform Updates:</strong> Optional information about new features, improvements, and non-essential changes to the platform.</li>
          <li><strong>AI Research Alerts:</strong> Optional notifications about research findings from AI agents monitoring entities you follow. This requires separate, explicit consent as described in the AI-Powered Features section.</li>
          <li><strong>Data Alerts:</strong> Optional notifications when specific data conditions are met for datasets you monitor, such as significant changes in budget execution or new data availability.</li>
          <li><strong>Forum Notifications:</strong> The community forum may send email notifications for replies, mentions, and periodic digests based on your forum notification preferences. These are managed through the forum settings.</li>
          <li><strong>Future Optional Notification Categories:</strong> We may introduce additional optional notification categories in the future. Where required, these will be offered through updated settings, campaign preference controls, or other clear activation flows before we send non-essential email notifications of that kind.</li>
          <li><strong>Unsubscribe:</strong> You may unsubscribe from optional notification types at any time via the unsubscribe link in the relevant email, through your notification preferences, through the forum settings where applicable, or by contacting us. This does not prevent us from sending essential or service-related communications when needed.</li>
          <li><strong>Email Delivery:</strong> We use your email address to deliver the optional notifications you have enabled and the essential or service-related communications described above. We do not sell, rent, or share your email address with third parties for marketing purposes.</li>
          <li><strong>Consent:</strong> Non-essential notifications are sent only with your explicit consent or other valid activation by you through the relevant settings or campaign preference flow, including campaign joins where recurring updates are clearly disclosed as enabled by default before you complete the relevant action. You can withdraw consent for any optional notification type at any time without affecting your account access or essential service communications.</li>
        </ul>

        <h3>Community forum</h3>
        <ul>
          <li><strong>Forum Access:</strong> The Service includes a community forum for civic discussion, learning content discussions, platform support, and discussions related to campaigns or partner-led activities, hosted through a self-hosted Discourse instance that we intend to operate with EU-based hosting at the relevant time. Some forum areas may be readable without an account, while other areas, including certain campaign spaces, embedded discussions, or restricted sections, may be limited to signed-in users, enrolled participants, or other eligible audiences depending on the relevant configuration.</li>
          <li><strong>Single Sign-On:</strong> The forum uses your Transparenta.eu account for authentication via DiscourseConnect SSO. When you access the forum, your user ID, email address, and display name or username are transmitted to the forum system. The forum may store that data together with your forum activity, including posts, replies, profile information, location, time zone, reading history, and IP addresses for operational and moderation purposes.</li>
          <li><strong>Anonymous or Pseudonymous Posting:</strong> The forum may offer anonymous mode or similar pseudonymous posting features. When active, your posts may appear without visible identification or under an alternate identity to other users and, where applicable, to certain partner teams or participants in the relevant context. However, the forum system and the platform operator, as well as administrators or moderators acting on its behalf, may still retain or access technical and account linkage necessary for security, moderation, abuse prevention, or legal compliance.</li>
          <li><strong>Visibility:</strong> Forum visibility depends on the area where content is posted. Some posts may be public and internet-accessible, while others may be visible only to signed-in users, enrolled campaign participants, or other limited user groups. By posting on the forum, you acknowledge that your contributions will be visible according to the access rules of the relevant area.</li>
          <li><strong>Illegal Content:</strong> You must not post content that is illegal under applicable law, including unlawful threats, harassment, hate speech, unlawful disclosure of third-party personal data, unlawful offensive or discriminatory content, false or defamatory factual allegations about identifiable persons or institutions, copyright infringement, fraud, malware, unlawful impersonation, or other unlawful content.</li>
          <li><strong>House Rules:</strong> You must not use the forum for spam, commercial solicitation, coordinated abuse, disruptive off-topic posting, intimidation, doxing, misleading impersonation, or other conduct that undermines the safety, integrity, or intended civic purpose of the forum.</li>
          <li><strong>Lawful Civic Discussion:</strong> Critical discussion, opinion, satire, or fact-based disagreement about public institutions, officials, or matters of public interest is not prohibited solely because it is unfavorable, controversial, or strongly worded.</li>
          <li><strong>Notice and Action:</strong> You may report allegedly illegal content or forum-rule violations through forum reporting tools where available or by emailing contact@transparenta.eu with sufficient detail for us to identify the content and understand the basis of the complaint.</li>
          <li><strong>Moderation Measures:</strong> We may remove content, disable access to content, lock threads, restrict visibility, suspend accounts, or terminate forum access where we reasonably believe content is illegal, violates the forum rules, or creates security or abuse risks.</li>
          <li><strong>Statements of Reasons and Appeals:</strong> Where required by applicable law and reasonably possible, we will provide the affected user with the main reasons for a significant moderation or account-restriction decision. Users may request internal review of moderation decisions by contacting contact@transparenta.eu. This does not limit any judicial or other remedies available under applicable law.</li>
          <li><strong>Repeat Misuse:</strong> Repeated illegal or abusive use of the forum may result in temporary or permanent restrictions on posting, interaction, or account access.</li>
          <li><strong>Legal Compliance and Disclosure:</strong> We may preserve, review, and disclose forum content, account information, technical identifiers, and anonymous-mode linkage where required by law, court order, subpoena, lawful authority request, or where reasonably necessary to investigate illegal or abusive conduct, protect rights or safety, or enforce these Terms.</li>
          <li><strong>Forum Email Notifications:</strong> Discourse has its own email notification system for topic replies, mentions, and digests. These notifications are managed through your forum profile settings and are separate from platform notification preferences.</li>
        </ul>

        <h3>Correspondence with public institutions</h3>
        <ul>
          <li><strong>Email Facilitation:</strong> The Service provides tools to prepare, send, or help you send emails to public institutions regarding budget matters.</li>
          <li><strong>Two Correspondence Models:</strong> Depending on the workflow, correspondence may be (i) prepared by the Service and opened in your own email client for you to send yourself, or (ii) sent directly by the platform on your behalf from a platform-controlled address. The relevant flow will indicate which model applies, what sender or reply address may be visible to the recipient, whether replies may be captured by the platform, and whether a campaign or partner identity is presented in the correspondence.</li>
          <li><strong>Copies, Capture, and Thread Tracking:</strong> In some workflows, the generated message may include a platform-controlled CC or reply-tracking address, thread identifier, or similar technical marker so the Service can detect that a message was sent, associate later replies with the correct thread, or help you track the status of the correspondence. If you keep those tracking details in the message, the platform may receive and store a copy of the sent email and any replies routed back through the tracked thread.</li>
          <li><strong>Per-Action Confirmation:</strong> Each correspondence action requires your active confirmation in the relevant flow before the platform sends the email, prepares it for your email client, or processes associated tracking data for that specific correspondence.</li>
          <li><strong>User Responsibility:</strong> You are solely responsible for the content, accuracy, and legality of any correspondence sent through the platform. The platform acts primarily as a technical facilitator and does not generally pre-approve, verify, or endorse the substance of your correspondence, although we may review, preserve, route, or refuse correspondence where reasonably necessary for abuse prevention, support, compliance, thread handling, quality control, or legal reasons.</li>
          <li><strong>No Abuse:</strong> You must not use correspondence tools for spam, harassment, threats, doxing, intimidation, abusive mass-contacting of institutions, or any unlawful or disproportionate interference with public institutions or third parties.</li>
          <li><strong>Enforcement:</strong> We may rate-limit, suspend, block, review, refuse, or report abusive use of the correspondence tools. We may also preserve and disclose relevant account, content, and technical data where required by law or where reasonably necessary to investigate illegal or abusive conduct.</li>
          <li><strong>Authorized Access:</strong> Authorized personnel or service providers may access correspondence records where reasonably necessary for support, abuse prevention, compliance, legal requests, quality control, or the operation of correspondence threading and reply handling.</li>
          <li><strong>Partner or Campaign Identity:</strong> For certain campaign-related correspondence, the relevant flow may state that the email is being sent under the name or umbrella of a campaign partner or organization. Where that is the case, the correspondence flow or campaign-specific terms must make that representation clear before you confirm the action.</li>
          <li><strong>Record Keeping:</strong> The platform may store records of correspondence prepared, sent, copied, or tracked through the Service, including the recipient institution, sender details you provided, CC or capture addresses, subject, message body, dates, delivery status, thread identifiers, replies received from the institution, and related review or processing notes, for your reference, service administration, and compliance purposes. You may request deletion of these records to the extent deletion is legally available.</li>
          <li><strong>No Legal Advice:</strong> The correspondence tools and templates provided are for informational purposes only and do not constitute legal advice. You are responsible for ensuring your correspondence complies with applicable law.</li>
        </ul>

        <h3>AI-powered features</h3>
        <ul>
          <li><strong>AI-Enhanced and Experimental Features:</strong> The Service may offer AI-enhanced or experimental features to help users analyze public data, process or summarize documents, extract structured information, classify or compare records, detect duplicate content, prioritize or review user-submitted or public-source materials, generate drafts, answer questions, detect patterns, or support research workflows. Some of these features may be optional, limited, beta, or withdrawn at any time.</li>
          <li><strong>Research and Monitoring Features:</strong> Where enabled, AI-powered research or monitoring features may analyze public institutions, public budget data, and public-source documents. In some cases, and only where clearly presented in the relevant feature flow, the Service may also process prompts, questions, or documents that you choose to submit for analysis.</li>
          <li><strong>Explicit Opt-In Required for Proactive AI Notifications:</strong> Proactive AI research notifications require your separate, explicit consent. This consent is distinct from other notification preferences and can be withdrawn at any time through your notification settings.</li>
          <li><strong>Acceptable Inputs:</strong> You should not submit confidential information or personal data of third parties to AI-enhanced features unless you have a lawful basis and the feature is designed to accept that type of input. Unless expressly stated otherwise, AI features are intended primarily for public data, public documents, and other lawful user-provided content.</li>
          <li><strong>Third-Party AI Providers:</strong> Some AI-enhanced or experimental features may rely on third-party AI or document-processing providers. Depending on the provider, configuration, and applicable provider terms, inputs and outputs submitted to such features may be retained by the provider and may be used for service improvement, model development, or training. Where a feature uses such a provider, the relevant feature notice or our privacy materials will identify the provider or point you to the maintained provider list.</li>
          <li><strong>No Guarantees:</strong> AI-generated outputs are provided for informational and assistive purposes only. They may contain errors, omissions, hallucinations, incorrect classifications, incomplete extractions, or misleading summaries. You must independently verify all AI-generated outputs before relying on them for any journalistic, civic, academic, professional, financial, or legal purpose.</li>
          <li><strong>No Professional Advice:</strong> AI-generated outputs do not constitute legal, financial, professional, or expert advice.</li>
          <li><strong>Transparency and Human Oversight:</strong> AI-generated or AI-assisted outputs presented to you through the Service will be identified as such in the relevant interface. Where we publish public-facing text, summaries, classifications, or similar materials that are materially generated or manipulated by AI, we will identify that use where required by applicable law. We may combine automated processing with human review, moderation, prioritization, or quality control.</li>
          <li><strong>Moderation and Risk Support:</strong> Where enabled, AI tools may also assist content classification, summarization, duplicate-content detection, moderation support, abuse detection, prioritization, review of user-submitted or public-source materials, or quality review. Such tools are assistive only and do not replace legal or factual judgment where human review is required.</li>
          <li><strong>Availability and Evolution:</strong> AI-enhanced and experimental features may change, improve, be restricted, or be discontinued without notice. Output quality may vary by model, language, data quality, or document format.</li>
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
          <li><strong>User Content Ownership:</strong> Subject to the licenses described below, you retain ownership of content you create, upload, save, submit, or publish through the Service, including forum posts, challenge submissions, annotations, correspondence drafts, saved maps, saved charts, and similar user-generated materials.</li>
          <li><strong>License for Private Content:</strong> For content you keep private or use only in non-public product flows, you grant Transparenta.eu a non-exclusive, royalty-free license limited to hosting, storing, reproducing, formatting, processing, securing, backing up, supporting, operating, and improving the Service and the specific feature you used.</li>
          <li><strong>License for Public Content:</strong> For content you choose to publish or share publicly through the Service, you grant Transparenta.eu a non-exclusive, royalty-free license to host, store, reproduce, display, distribute, format, adapt for technical presentation, archive, and promote that public content and the Service in connection with that public availability.</li>
          <li><strong>License Duration:</strong> The license for private content ends when the relevant content is deleted from our active systems, subject to backups, legal retention, dispute handling, and technical limitations. The license for public content continues for as long as the content remains public or as reasonably necessary for archives, backups, public-discussion integrity, or materials already redistributed by others.</li>
          <li><strong>Public Sharing:</strong> If you choose to post, publish, or share content publicly through the Service, including contributions in public forum areas or publicly shared maps and similar public outputs, that content may become accessible to the public, may be indexed by search engines, and may be copied or reshared by others.</li>
          <li><strong>User Warranties:</strong> You represent that you have the rights necessary to submit the content and that its use as permitted by these Terms does not infringe third-party rights or applicable law.</li>
          <li>The Service's software, design, and original content are protected by copyright and other intellectual property laws.</li>
        </ul>

        <h3>Exports and attribution</h3>
        <p>Include visible attribution to the data source and Transparenta.eu when sharing charts, maps, screenshots, or similar visual outputs generated through the Service.</p>
        <blockquote>
          <p><strong>Recommended:</strong> Chart: „Titlul Graficului" | Source: Ministerul Finanțelor, via Transparenta.eu.</p>
        </blockquote>

        <h3>Data storage and retention</h3>
        <ul>
          <li><strong>Account Data:</strong> When you create an account, we store your user ID, name, email address, and notification preferences for as long as your account is active.</li>
          <li><strong>Notification Subscriptions:</strong> We store your notification subscription preferences, including the entities you follow and the types of updates you wish to receive.</li>
          <li><strong>Forum Data:</strong> The forum stores your posts, profile information, location and time zone if you provide them, reading history, and activity logs for as long as needed to operate the forum and enforce these Terms. Deleting your account may not automatically remove all forum content, especially content already published or retained for discussion integrity and moderation.</li>
          <li><strong>Correspondence Records:</strong> Records of correspondence prepared, sent, copied, or tracked through the platform are retained for 5 years, unless deletion is required earlier by applicable law or the relevant data is lawfully deleted sooner.</li>
          <li><strong>AI Feature Data:</strong> Inputs and outputs associated with AI-enhanced or experimental features may be retained by us for 5 years, unless a shorter retention period is expressly stated for the relevant feature or deletion is required earlier by applicable law. Third-party AI providers may apply their own retention and training practices as described above.</li>
          <li><strong>Deletion:</strong> You may request deletion or anonymization of account data we control at any time by contacting us or using account deletion features when available, subject to the Privacy Policy, legal exceptions, backups, technical limitations, forum-discussion integrity, and records already delivered to public institutions or other independent controllers.</li>
        </ul>

        <h3>Limitation of liability</h3>
        <p>To the maximum extent permitted by applicable law, Claudiu Constantin Bogdan shall not be liable for indirect, incidental, special, consequential, or exemplary damages, including loss of profits, revenue, data, goodwill, or other intangible losses, resulting from: (i) your access to, use of, or inability to use the Service; (ii) your reliance on third-party public data, user-generated content, or AI-generated outputs; (iii) financial, professional, personal, or other loss arising from actions taken on the basis of information obtained through the Service; or (iv) unauthorized access to or use of our systems despite reasonable safeguards. Nothing in these Terms excludes or limits liability where such exclusion or limitation is prohibited by applicable law, including liability for intentional misconduct, gross negligence, fraud, death or personal injury where non-excludable, mandatory consumer rights, or judicial remedies available under applicable law.</p>

        <h3>Availability and changes</h3>
        <p>We may change or discontinue the Service at any time. We may update these Terms from time to time to reflect changes in our practices, new features, or legal requirements.</p>
        <ul>
          <li><strong>Notification of Changes:</strong> For material changes to these Terms, we will provide at least 30 days advance notice by publishing the updated Terms with the future effective date and sending an email notification to registered users.</li>
          <li><strong>Acceptance of Updated Terms:</strong> After the effective date of updated Terms, you will be asked to review and accept the changes on your next login. Continued use of the Service after accepting the updated Terms constitutes your agreement to the changes.</li>
          <li><strong>Version History:</strong> Previous versions of these Terms are available upon request by contacting us at contact@transparenta.eu.</li>
        </ul>

        <h3>Governing law</h3>
        <p>Romanian law and applicable EU law, including GDPR, without prejudice to mandatory consumer protection rules that may apply to you. Disputes fall under the jurisdiction of the competent courts of Romania, except where applicable law grants consumers the right to bring proceedings elsewhere.</p>

        <h3>Contact</h3>
        <p>Transparenta.eu is operated by Claudiu Constantin Bogdan. Contact us at contact@transparenta.eu. See also our <Link to="/privacy" className="underline">Privacy Policy</Link> and <Link to="/cookie-policy" className="underline">Cookie Policy</Link>.</p>
      </div>
    </div>
  )
}
