import React from "react";
import { useNavigate } from "react-router-dom";

const TermsPage = () => {
  const navigate = useNavigate();

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <h1>Terms of Service</h1>

      <h2>Acceptance of Terms</h2>
      <p>
        By accessing and using the Journify application ("the Service"),
        operated by Hopelog, you are agreeing to be bound by these Terms of
        Service. If you do not agree to these terms, please do not use the
        Service.
      </p>

      <h2>Use of the Service</h2>
      <p>
        You agree to use the Service only for purposes permitted by these Terms
        of Service and any applicable laws, regulations, or generally accepted
        practices in the relevant jurisdictions. Journify reserves the right to
        refuse service to anyone for any reason at any time.
      </p>

      <h2>User Content</h2>
      <p>
        As a private journaling service, we respect and protect your privacy.
        You retain full ownership of any intellectual property rights that you
        hold in the content that you create or own ("User Content"). When you
        upload or submit content to our Services, you give Journify permission
        to store and protect this content on your behalf. We will not use,
        host, reproduce, modify, create derivative works, communicate, publish,
        publicly perform, publicly display, or distribute your User Content for
        any other purposes.
      </p>

      <h2>Subscription Services</h2>
      <ul>
        <li>
          <strong>Billing:</strong> Subscriptions are billed in advance on a
          recurring basis according to the plan you select. Your subscription
          will auto-renew under the same terms unless you or we cancel it.
        </li>
        <li>
          <strong>Cancellation:</strong> You can cancel your subscription at
          any time. No refunds will be provided for the remaining period of
          your current subscription, but you will retain access to paid
          services until the end of the subscription period. For in-app
          subscriptions, cancellation should be done through the appropriate
          application store.
        </li>
        <li>
          <strong>Payment:</strong> You agree to provide accurate billing
          information and to keep it up to date. Payments are facilitated
          through third-party processors (Payment Processors), such as Stripe
          for payments through our site or Apple and Google for in-app
          payments. By using these services, you also agree to the terms and
          conditions of the Payment Processors.
        </li>
        <li>
          <strong>Modification of Fees:</strong> We may modify subscription
          fees at any time, with changes taking effect at the end of your
          current subscription period. You will be notified in advance of any
          changes, and your continued use of the Services will signify your
          agreement to the new fees.
        </li>
        <li>
          <strong>Refunds:</strong> Except where required by law, paid
          subscription fees are non-refundable. Some refunds may be considered
          on a case-by-case basis. For in-app subscriptions, refunds are
          governed by the appropriate application store’s policy.
        </li>
        <li>
          <strong>Free Trials:</strong> We may offer free trial periods for our
          subscription services. Unless you cancel before the end of the trial,
          you will be billed for the subscription at the end of the trial
          period. We may modify or cancel free trial offers at any time.
        </li>
        <li>
          <strong>Promotions:</strong> Any promotions are subject to their own
          rules, which will prevail over these terms in case of conflict.
        </li>
      </ul>

      <h2>Modification and Termination of Services</h2>
      <p>
        We are constantly innovating and changing our Services, and we may add
        or remove functionalities or features, and we may suspend or stop a
        Service altogether.
      </p>

      <h2>Disclaimer</h2>
      <p>
        The Services are provided on an "as-is" basis without any warranties,
        either express or implied, including but not limited to warranties of
        merchantability, fitness for a particular purpose, or non-infringement.
        Journify, its affiliates, and third-party service providers disclaim
        all warranties to the fullest extent permitted by law.
      </p>

      <h2>Limitation of Liability</h2>
      <p>
        You expressly understand and agree that Journify shall not be liable
        for any direct, indirect, incidental, special, consequential, or
        exemplary damages, including damages for loss of profits, goodwill,
        use, data or other intangible losses.
      </p>

      <h2>Indemnity</h2>
      <p>
        You agree to indemnify and hold harmless Journify and its affiliates,
        officers, directors, employees, agents, and third-party service
        providers from any losses, liabilities, damages, claims, and expenses,
        including legal fees, arising out of or related to your use of the
        Services or any violation of these Terms.
      </p>

      <h2>Privacy and Personal Information</h2>
      <p>
        For information about Journify’s data protection practices, please read
        our <strong>Privacy Policy</strong>. This policy explains how we treat
        your personal information and protect your privacy when you use our
        Services.
      </p>

      <h2>Changes to these Terms</h2>
      <p>
        We may modify these terms or any additional terms that apply to a
        Service to, for example, reflect changes to the law or changes to our
        Services. Please review these Terms of Service regularly. Your
        continued use of the Services after the effectiveness of such changes
        will constitute acceptance of and agreement to any such changes.
      </p>

      <h2>Contact Us</h2>
      <p>
        If you have any questions about these terms, you can reach us at{" "}
        <a href="mailto:support@Journify.app">support@Journify.app</a>.
      </p>

      <button onClick={() => navigate(-1)} style={{ marginTop: "20px" }}>
        Go Back
      </button>
    </div>
  );
};

export default TermsPage;
