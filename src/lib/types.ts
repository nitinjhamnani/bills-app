export type Role =
  | "PLATFORM_ADMIN"
  | "ORGANISATION_ADMIN"
  | "MAKER"
  | "CHECKER"
  | "VIEWER"
  | "CLIENT_ADMIN"
  | "CLIENT_OPERATOR";

export interface UserProfile {
  userId: string;
  phoneNumber: string;
  displayName: string;
  role: Role;
  tenantSchema: string | null;
  clientId: string | null;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
  user: UserProfile;
}

export interface OrganisationSummary {
  id: string;
  organisationCode: string;
  organisationName: string;
  tenantSchema: string;
  status: string;
  createdAt: string;
}

export interface PlatformOrganisationUser {
  userId: string;
  displayName: string;
  phoneNumber: string;
  email: string | null;
  role: string;
  status: string;
  createdAt: string;
}

export interface PlatformOrganisationUserDetail extends PlatformOrganisationUser {
  organisationId: string;
  organisationName: string;
  clientId: string | null;
  clientName: string | null;
  clientCode: string | null;
}

export interface PlatformOrganisationClient {
  id: string;
  clientName: string;
  clientCode: string | null;
  clientType: ClientType;
  status: "ACTIVE" | "SUSPENDED" | "TERMINATED";
  contactPhone: string | null;
  createdAt: string;
  admin: PlatformOrganisationUser | null;
}

export interface PlatformOrganisationDetail extends OrganisationSummary {
  admin: PlatformOrganisationUser | null;
  staff: PlatformOrganisationUser[];
  clients: PlatformOrganisationClient[];
  clientCount: number;
  staffCount: number;
  billsPendingPickup: number;
  billsInProcess: number;
  billsPaid: number;
  totalGmv: number;
}

export interface BillerService {
  id: string;
  serviceCode: string;
  serviceName: string;
  category: string;
  active: boolean;
}

export interface OrganisationMe {
  userId: string;
  fullName: string;
  phoneNumber: string;
  role: string;
  organisationName: string;
  organisationCode: string;
}

export type ClientType = "CORPORATE" | "PARTNER";

export interface Client {
  id: string;
  clientName: string;
  clientCode: string | null;
  contactPhone: string | null;
  clientType: ClientType;
  status: "ACTIVE" | "SUSPENDED" | "TERMINATED";
  createdAt: string;
}

export interface OrganisationUser {
  id: string;
  phoneNumber: string;
  fullName: string;
  email: string | null;
  role: string;
  status: "ACTIVE" | "SUSPENDED";
}

export interface OrganisationBillServiceConfig {
  billServiceCode: string;
  billServiceName: string;
  enabled: boolean;
}

export interface ClientBillServiceConfig {
  billServiceCode: string;
  enabled: boolean;
}

export interface ClientUser {
  id: string;
  phoneNumber: string;
  fullName: string;
  role: string;
  status: "ACTIVE" | "SUSPENDED";
}

export interface ApprovalRule {
  actionType: "BILL_PAYMENT" | "OFFLINE_TOPUP_CREDIT";
  minAmount: number;
  requiredApproverCount: number;
}

export interface FeeConfig {
  billServiceCode: string | null;
  feeType: "FLAT" | "PERCENTAGE";
  value: number;
  enabled: boolean;
}

export type PaymentStatus = "PROCESSING" | "PENDING" | "PAID" | "FAILED";
export type BillLifecycleStatus = "PROCESSING" | "DUE" | "PAID" | "FAILED";
export type OrgStatus = "NA" | "PENDING" | "IN_PROCESS" | "PAID";

export interface Biller {
  billerId: string;
  billerName: string;
  category: string;
  state: string | null;
}

/** One line of a bill's amount break-up, e.g. { label: "Current Charges", amount: 450 }. */
export interface AmountComponent {
  label: string;
  amount: number;
}

/** Mirrors a real BBPS Bill Fetch response - shown to the client to review before confirming creation. */
/** A Managed Bill - one row per unique bill account, always the latest fetch cycle's data. */
export interface ManagedBill {
  id: string;
  clientId: string;
  /** Only populated on the organisation-wide view (lists every client's bills together). */
  clientName: string | null;
  clientCode: string | null;
  billServiceCode: string;
  billServiceName: string;
  billerName: string;
  billerId: string | null;
  customerBillAccountNumber: string;
  customerName: string | null;
  customerMobileNumber: string | null;
  amount: number | null;
  amountBreakdown: AmountComponent[];
  billNumber: string | null;
  billDate: string | null;
  dueDate: string | null;
  billPeriod: string | null;
  paymentStatus: PaymentStatus;
  billStatus: BillLifecycleStatus;
  lastFetchAt: string | null;
  lastFetchFailed: boolean;
  lastFetchFailureReason: string | null;
  autoFetchEnabled: boolean;
  autoPayEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/** One fetch/payment cycle for a bill - what My Payments (client and organisation side) lists. */
export interface BillPayment {
  id: string;
  billId: string;
  clientId: string;
  billServiceCode: string;
  billServiceName: string;
  billerName: string;
  billerId: string | null;
  customerBillAccountNumber: string;
  customerName: string | null;
  customerMobileNumber: string | null;
  amount: number;
  amountBreakdown: AmountComponent[];
  billNumber: string | null;
  billDate: string | null;
  dueDate: string | null;
  billPeriod: string | null;
  orgStatus: OrgStatus;
  paymentStatus: PaymentStatus;
  billStatus: BillLifecycleStatus;
  clientPaidAt: string | null;
  clientPaidBy: string | null;
  orgPickedUpAt: string | null;
  orgPickedUpBy: string | null;
  orgPaidAt: string | null;
  orgPaidBy: string | null;
  bbpsTransactionId: string | null;
  externalTransactionId: string | null;
  billType: string | null;
  billPayFailureReason: string | null;
  createdAt: string;
  updatedAt: string;
  awaitingChecker?: boolean;
  canSettle?: boolean;
}

export interface BillActivityLogEntry {
  eventType:
    | "CREATED"
    | "FETCH_SUCCESS"
    | "FETCH_FAILED_TRANSIENT"
    | "FETCH_FAILED_PERMANENT"
    | "CLIENT_PAID"
    | "ORG_PICKED_UP"
    | "ORG_PAID"
    | "ORG_MARK_FAILED";
  description: string | null;
  actor: string | null;
  createdAt: string;
}

export interface BillLedgerEntry {
  walletType: "WALLET";
  entryType: "DEBIT" | "CREDIT";
  amount: number;
  balanceAfter: number;
  referenceType: string;
  description: string | null;
  createdAt: string;
}

export interface WalletBalance {
  walletBalance: number;
}

export interface LedgerEntryDto {
  entryType: "DEBIT" | "CREDIT";
  amount: number;
  balanceAfter: number;
  referenceType: string;
  referenceId: string | null;
  description: string | null;
  createdAt: string;
}

export type PaymentMode = "RTGS" | "NEFT" | "UPI" | "CASH" | "OTHER";

export interface WalletTopup {
  id: string;
  amount: number;
  paymentMode: PaymentMode;
  paymentReference: string | null;
  documentId: string | null;
  status: "PENDING" | "COMPLETED" | "REJECTED";
  createdAt: string;
}

/** Same as WalletTopup, plus which client it's for - only returned by the organisation-wide pending list. */
export interface PendingWalletTopup extends WalletTopup {
  clientId: string;
  clientName: string;
  clientCode: string | null;
  canReview?: boolean;
}

export interface Dispute {
  id: string;
  billPaymentId: string;
  reason: string;
  status: "RAISED" | "UNDER_REVIEW" | "RESOLVED_VALID" | "RESOLVED_INVALID";
  resolutionNotes: string | null;
  raisedBy: string | null;
  resolvedBy: string | null;
  createdAt: string;
  clientId: string | null;
  clientName: string | null;
  clientCode: string | null;
  billPayment: BillPayment | null;
}

export type SupportTicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED";

export type SupportTicketAuthorSide = "CLIENT" | "ORGANISATION" | "SYSTEM";

export interface SupportTicketMessage {
  id: string;
  ticketId: string;
  authorSide: SupportTicketAuthorSide;
  authorUserId: string | null;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  status: SupportTicketStatus;
  raisedBy: string | null;
  resolvedBy: string | null;
  resolutionNotes: string | null;
  lastMessagePreview?: string | null;
  lastMessageAt?: string | null;
  unread?: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Same as SupportTicket, plus which client it's for - only returned by the organisation-wide list. */
export interface OrganisationSupportTicket extends SupportTicket {
  clientId: string;
  clientName: string;
  clientCode: string | null;
  pickedUpBy: string | null;
}

export interface ClientWallet {
  clientId: string;
  clientName: string;
  clientCode: string | null;
  balance: number;
}

export interface AuditLogEntry {
  actorUserId: string | null;
  actorRole: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  details: string | null;
  createdAt: string;
}

export interface PlatformAnalytics {
  organisationCount: number;
  totalBillsPaid: number;
  totalGmv: number;
}

export interface OrganisationAnalytics {
  clientCount: number;
  billsPendingPickup: number;
  billsInProcess: number;
  billsPaid: number;
  billsFailed: number;
  totalGmv: number;
}

export interface ClientAnalytics {
  totalBills: number;
  totalAmount: number;
  pendingBills: number;
  pendingAmount: number;
  paidBills: number;
  paidAmount: number;
  completedBills: number;
  completedAmount: number;
  walletBalance: number;
}

export interface BulkRowResult {
  row: number;
  success: boolean;
  billId: string | null;
  error: string | null;
}

export interface WalletStatement {
  openingBalance: number;
  closingBalance: number;
  totalCredits: number;
  totalDebits: number;
  entries: BillLedgerEntry[];
}

export interface ClientPortfolioRow {
  clientId: string;
  clientName: string;
  clientCode: string | null;
  clientType: ClientType;
  status: "ACTIVE" | "SUSPENDED" | "TERMINATED";
  createdAt: string;
  walletBalance: number;
  totalBillPayments: number;
  totalPaidAmount: number;
  outstandingAmount: number;
  pendingSettlementAmount: number;
}

export interface RevenueRow {
  clientId: string;
  clientName: string;
  clientCode: string | null;
  amount: number;
  description: string | null;
  createdAt: string;
}

export interface RevenueByClientRow {
  clientId: string;
  clientName: string;
  clientCode: string | null;
  feeCount: number;
  totalAmount: number;
}

export interface FundingRow {
  id: string;
  clientId: string;
  clientName: string;
  clientCode: string | null;
  amount: number;
  paymentMode: PaymentMode;
  status: "PENDING" | "COMPLETED" | "REJECTED";
  paymentReference: string | null;
  requestedBy: string | null;
  reviewedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdjustmentRow {
  clientId: string;
  clientName: string;
  clientCode: string | null;
  amount: number;
  description: string | null;
  createdAt: string;
}

export interface AgingRow {
  paymentId: string;
  billId: string;
  clientId: string;
  clientName: string;
  clientCode: string | null;
  billerName: string;
  customerBillAccountNumber: string;
  amount: number;
  orgStatus: OrgStatus;
  stuckSince: string;
  daysStuck: number;
  dueDate: string | null;
}

export interface ClientGmvRow {
  clientId: string;
  clientName: string;
  clientCode: string | null;
  clientPaidCount: number;
  clientPaidAmount: number;
  orgSettledCount: number;
  orgSettledAmount: number;
}

export interface SpendByServiceRow {
  billServiceCode: string;
  billServiceName: string;
  count: number;
  amount: number;
}

export interface OrganisationPortfolioRow {
  organisationId: string;
  organisationCode: string;
  organisationName: string;
  status: string;
  createdAt: string;
  clientCount: number;
  staffCount: number;
  totalGmv: number;
}

export interface OrganisationGmvRow {
  organisationId: string;
  organisationCode: string;
  organisationName: string;
  billsPaid: number;
  totalAmount: number;
}

/** Which top-level module a role lands in after login. */
export function moduleForRole(role: Role): "platform" | "organisation" | "client" {
  if (role === "PLATFORM_ADMIN") return "platform";
  if (role === "CLIENT_ADMIN" || role === "CLIENT_OPERATOR") return "client";
  return "organisation";
}
