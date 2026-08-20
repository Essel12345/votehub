/**
 * Notification Type Handlers
 * Defines templates and content for all notification types
 * 
 * IMPORTANT: Never include sensitive data like ballot selections, vote choices, passwords, or tokens
 */

export enum NotificationType {
  INVITATION_RECEIVED = "INVITATION_RECEIVED",
  ELECTION_CREATED = "ELECTION_CREATED",
  ELECTION_PUBLISHED = "ELECTION_PUBLISHED",
  ELECTION_OPENED = "ELECTION_OPENED",
  ELECTION_CLOSING_SOON = "ELECTION_CLOSING_SOON",
  ELECTION_CLOSED = "ELECTION_CLOSED",
  CANDIDATE_SUBMITTED = "CANDIDATE_SUBMITTED",
  CANDIDATE_APPROVED = "CANDIDATE_APPROVED",
  CANDIDATE_REJECTED = "CANDIDATE_REJECTED",
  CANDIDATE_WITHDRAWN = "CANDIDATE_WITHDRAWN",
  VOTER_ADDED_TO_ELECTION = "VOTER_ADDED_TO_ELECTION",
  BALLOT_SUBMITTED = "BALLOT_SUBMITTED",
  RESULTS_PUBLISHED = "RESULTS_PUBLISHED",
  SECURITY_ALERT = "SECURITY_ALERT",
}

export interface NotificationTemplate {
  title: string;
  message: string;
  htmlTemplate: string;
  textTemplate: string;
}

/**
 * Get notification template by type
 * Supports template variable substitution: {organizationName}, {electionTitle}, {positionTitle}, {candidateName}, etc.
 */
export function getNotificationTemplate(
  type: NotificationType,
  variables: Record<string, string> = {}
): NotificationTemplate {
  const templates: Record<NotificationType, NotificationTemplate> = {
    [NotificationType.INVITATION_RECEIVED]: {
      title: "You're Invited to {organizationName}",
      message: "You have been invited to join {organizationName} on VoteHub.",
      htmlTemplate: `
        <h2>Welcome to {organizationName}</h2>
        <p>You have been invited to join <strong>{organizationName}</strong> on VoteHub.</p>
        <p>Click the link below to accept the invitation and set up your account:</p>
        <p><a href="{invitationLink}" style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Accept Invitation</a></p>
        <p>If you have any questions, please contact your organization administrator.</p>
      `,
      textTemplate: `Welcome to {organizationName}\n\nYou have been invited to join {organizationName} on VoteHub.\n\nAccept your invitation: {invitationLink}\n\nIf you have any questions, please contact your organization administrator.`,
    },
    [NotificationType.ELECTION_CREATED]: {
      title: "New Election: {electionTitle}",
      message: "A new election \"{electionTitle}\" has been created in {organizationName}.",
      htmlTemplate: `
        <h2>New Election Created</h2>
        <p>A new election <strong>"{electionTitle}"</strong> has been created in <strong>{organizationName}</strong>.</p>
        <p>Election Details:</p>
        <ul>
          <li><strong>Title:</strong> {electionTitle}</li>
          <li><strong>Start Date:</strong> {startDate}</li>
          <li><strong>End Date:</strong> {endDate}</li>
          <li><strong>Status:</strong> {status}</li>
        </ul>
        <p><a href="{electionLink}" style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View Election</a></p>
      `,
      textTemplate: `New Election Created\n\nA new election "{electionTitle}" has been created in {organizationName}.\n\nStart: {startDate}\nEnd: {endDate}\nStatus: {status}\n\nView: {electionLink}`,
    },
    [NotificationType.ELECTION_PUBLISHED]: {
      title: "Election Published: {electionTitle}",
      message: "The election \"{electionTitle}\" is now published.",
      htmlTemplate: `
        <h2>Election Published</h2>
        <p>The election <strong>"{electionTitle}"</strong> has been published and is now visible to voters.</p>
        <p>Voters can now view candidates and prepare for voting when the election opens.</p>
        <p><a href="{electionLink}" style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View Election</a></p>
      `,
      textTemplate: `Election Published\n\nThe election "{electionTitle}" has been published.\n\nVoters can now view candidates and prepare for voting.\n\nView: {electionLink}`,
    },
    [NotificationType.ELECTION_OPENED]: {
      title: "Voting Open: {electionTitle}",
      message: "Voting is now open for \"{electionTitle}\".",
      htmlTemplate: `
        <h2>Voting is Open</h2>
        <p>Voting is now open for <strong>"{electionTitle}"</strong>.</p>
        <p>You can now cast your vote. Voting will close on <strong>{endDate}</strong>.</p>
        <p><a href="{votingLink}" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Vote Now</a></p>
      `,
      textTemplate: `Voting is Open\n\nVoting is now open for "{electionTitle}".\n\nCast your vote before {endDate}.\n\nVote: {votingLink}`,
    },
    [NotificationType.ELECTION_CLOSING_SOON]: {
      title: "Reminder: {electionTitle} Closing Soon",
      message: "The election \"{electionTitle}\" will close soon. Make sure to vote!",
      htmlTemplate: `
        <h2>Election Closing Soon</h2>
        <p>The election <strong>"{electionTitle}"</strong> will close in <strong>{hoursRemaining} hours</strong>.</p>
        <p>If you haven't voted yet, please do so now before it's too late.</p>
        <p><a href="{votingLink}" style="background-color: #ff9800; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Vote Now</a></p>
        <p>Voting closes at: <strong>{endDate}</strong></p>
      `,
      textTemplate: `Election Closing Soon\n\nThe election "{electionTitle}" will close in {hoursRemaining} hours.\n\nVote before {endDate}.\n\nVote: {votingLink}`,
    },
    [NotificationType.ELECTION_CLOSED]: {
      title: "Election Closed: {electionTitle}",
      message: "The election \"{electionTitle}\" has closed.",
      htmlTemplate: `
        <h2>Election Closed</h2>
        <p>The election <strong>"{electionTitle}"</strong> has closed.</p>
        <p>Voting is no longer available. Results will be published soon.</p>
        <p><a href="{electionLink}" style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View Election</a></p>
      `,
      textTemplate: `Election Closed\n\nThe election "{electionTitle}" has closed.\n\nResults will be published soon.\n\nView: {electionLink}`,
    },
    [NotificationType.CANDIDATE_SUBMITTED]: {
      title: "Candidate Submission: {candidateName}",
      message: "Your candidacy for {positionTitle} in {electionTitle} has been submitted.",
      htmlTemplate: `
        <h2>Candidacy Submitted</h2>
        <p>Your candidacy has been submitted for <strong>{positionTitle}</strong> in <strong>{electionTitle}</strong>.</p>
        <p>An administrator will review your submission. You will be notified once approved.</p>
        <p><a href="{candidateLink}" style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View Submission</a></p>
      `,
      textTemplate: `Candidacy Submitted\n\nYour submission for {positionTitle} in {electionTitle} has been received.\n\nAwiting administrator approval.\n\nView: {candidateLink}`,
    },
    [NotificationType.CANDIDATE_APPROVED]: {
      title: "Candidate Approved: {candidateName}",
      message: "Your candidacy for {positionTitle} in {electionTitle} has been approved.",
      htmlTemplate: `
        <h2>Candidacy Approved</h2>
        <p>Congratulations! Your candidacy for <strong>{positionTitle}</strong> in <strong>{electionTitle}</strong> has been approved.</p>
        <p>Your profile will now be visible to voters in the election.</p>
        <p><a href="{candidateLink}" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View Your Profile</a></p>
      `,
      textTemplate: `Candidacy Approved\n\nYour candidacy for {positionTitle} in {electionTitle} has been approved.\n\nVoters can now see your profile.\n\nView: {candidateLink}`,
    },
    [NotificationType.CANDIDATE_REJECTED]: {
      title: "Candidate Submission Rejected",
      message: "Your candidacy for {positionTitle} in {electionTitle} was not approved.",
      htmlTemplate: `
        <h2>Candidacy Rejected</h2>
        <p>Your candidacy for <strong>{positionTitle}</strong> in <strong>{electionTitle}</strong> was not approved.</p>
        <p><strong>Reason:</strong> {rejectionReason}</p>
        <p>If you have questions, please contact the election administrator.</p>
        <p><a href="{contactLink}" style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Contact Administrator</a></p>
      `,
      textTemplate: `Candidacy Not Approved\n\nYour candidacy for {positionTitle} in {electionTitle} was not approved.\n\nReason: {rejectionReason}\n\nContact: {contactLink}`,
    },
    [NotificationType.CANDIDATE_WITHDRAWN]: {
      title: "Candidacy Withdrawn: {candidateName}",
      message: "A candidacy for {positionTitle} in {electionTitle} has been withdrawn.",
      htmlTemplate: `
        <h2>Candidacy Withdrawn</h2>
        <p>A candidacy for <strong>{positionTitle}</strong> in <strong>{electionTitle}</strong> has been withdrawn.</p>
        <p>This candidate will no longer appear in the election.</p>
        <p><a href="{electionLink}" style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View Election</a></p>
      `,
      textTemplate: `Candidacy Withdrawn\n\nA candidacy for {positionTitle} has been withdrawn.\n\nThis candidate will no longer appear in the election.\n\nView: {electionLink}`,
    },
    [NotificationType.VOTER_ADDED_TO_ELECTION]: {
      title: "You're Added to Election: {electionTitle}",
      message: "You have been added as a voter to the election \"{electionTitle}\".",
      htmlTemplate: `
        <h2>Voter Registration</h2>
        <p>You have been added as a voter to the election <strong>"{electionTitle}"</strong>.</p>
        <p>You will be able to vote once the election opens. Election details:</p>
        <ul>
          <li><strong>Election:</strong> {electionTitle}</li>
          <li><strong>Voting Opens:</strong> {startDate}</li>
          <li><strong>Voting Closes:</strong> {endDate}</li>
        </ul>
        <p><a href="{electionLink}" style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View Election</a></p>
      `,
      textTemplate: `Voter Registration\n\nYou are registered as a voter for "{electionTitle}".\n\nOpens: {startDate}\nCloses: {endDate}\n\nView: {electionLink}`,
    },
    [NotificationType.BALLOT_SUBMITTED]: {
      title: "Vote Recorded: {electionTitle}",
      message: "Your vote for \"{electionTitle}\" has been recorded successfully.",
      htmlTemplate: `
        <h2>Vote Recorded Successfully</h2>
        <p>Your vote for <strong>"{electionTitle}"</strong> has been recorded successfully.</p>
        <p><strong>Submission Reference:</strong> {referenceCode}</p>
        <p>Thank you for participating in this election.</p>
        <p><a href="{electionLink}" style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View Election Results</a></p>
      `,
      textTemplate: `Vote Recorded\n\nYour vote for "{electionTitle}" has been recorded.\n\nReference: {referenceCode}\n\nThank you for participating.\n\nView: {electionLink}`,
    },
    [NotificationType.RESULTS_PUBLISHED]: {
      title: "Election Results: {electionTitle}",
      message: "The results for \"{electionTitle}\" have been published.",
      htmlTemplate: `
        <h2>Election Results Published</h2>
        <p>The results for <strong>"{electionTitle}"</strong> have been published.</p>
        <p>You can now view the election results and see who won.</p>
        <p><a href="{resultsLink}" style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View Results</a></p>
      `,
      textTemplate: `Election Results Published\n\nResults for "{electionTitle}" are now available.\n\nView: {resultsLink}`,
    },
    [NotificationType.SECURITY_ALERT]: {
      title: "Security Alert: {alertType}",
      message: "A security alert has been triggered in your organization.",
      htmlTemplate: `
        <h2>Security Alert</h2>
        <p>A security alert has been triggered in your organization:</p>
        <p><strong>Alert Type:</strong> {alertType}</p>
        <p><strong>Timestamp:</strong> {timestamp}</p>
        <p><strong>Description:</strong> {alertDescription}</p>
        <p>If you did not authorize this action, please contact your administrator immediately.</p>
        <p><a href="{securityLink}" style="background-color: #d9534f; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View Security Center</a></p>
      `,
      textTemplate: `Security Alert\n\nAlert Type: {alertType}\nTimestamp: {timestamp}\n\nDescription: {alertDescription}\n\nIf unauthorized, contact your administrator.\n\nView: {securityLink}`,
    },
  };

  const template = templates[type];
  if (!template) {
    throw new Error(`Unknown notification type: ${type}`);
  }

  // Substitute variables in template
  return {
    title: substituteVariables(template.title, variables),
    message: substituteVariables(template.message, variables),
    htmlTemplate: substituteVariables(template.htmlTemplate, variables),
    textTemplate: substituteVariables(template.textTemplate, variables),
  };
}

/**
 * Substitute template variables
 * Example: "Hello {name}" with {name: "John"} => "Hello John"
 */
function substituteVariables(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return variables[key] ?? match;
  });
}
