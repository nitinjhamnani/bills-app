export type Portal = "PLATFORM" | "CORPORATE" | "VENDOR";

export type Role =
  | "SUPER_ADMIN"
  | "ORGANISATION_ADMIN"
  | "MAKER"
  | "CHECKER"
  | "VIEWER"
  | "SALES"
  | "CORP_ADMIN"
  | "CORP_OPERATOR"
  | "BRANCH_USER"
  | "VENDOR_ADMIN"
  | "VENDOR_OPERATOR";

export function isOrgAdmin(role: Role | string | null | undefined): boolean {
  return role === "SUPER_ADMIN" || role === "ORGANISATION_ADMIN";
}

export interface UserProfile {
  userId: string;
  phoneNumber: string;
  userCode: string | null;
  displayName: string;
  email?: string | null;
  status?: "ACTIVE" | "SUSPENDED";
  createdAt?: string | null;
  portal: Portal;
  userType?: string;
  role: Role;
  tenantSchema: string | null;
  clientId: string | null;
  branchId: string | null;
  clientType?: ClientType | null;
}

export interface LoginResponse {
  sessionId: string;
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInSeconds: number;
  user: UserProfile;
}

export interface SessionResponse {
  sessionId: string;
  user: UserProfile;
}

export interface OrganisationMe {
  userId: string;
  fullName: string;
  phoneNumber: string;
  role: string;
  organisationName: string;
  organisationCode: string;
}

export type ClientType = "CORPORATE" | "VENDOR";
export type CorporateKind = "COMPANY" | "INDIVIDUAL";

export interface Client {
  id: string;
  clientName: string;
  clientCode: string | null;
  contactPersonName?: string | null;
  contactEmail?: string | null;
  contactPhone: string | null;
  clientType: ClientType;
  corporateKind?: CorporateKind | null;
  status: "PENDING" | "ACTIVE" | "SUSPENDED" | "TERMINATED";
  createdAt: string;
  kycStatus?: "NOT_STARTED" | "PENDING" | "COMPLETE";
  contractStatus?: "NOT_STARTED" | "PENDING" | "SIGNED";
  detailsSubmitted?: boolean;
  salesUserId?: string | null;
  salesPersonName?: string | null;
  branchCount?: number;
}

export interface SalesCorporate {
  clientId: string;
  clientName: string;
  clientCode: string | null;
  accountStatus: string;
  onboardingStep: string;
  businessAmount: number;
  businessCount: number;
  monthBusinessAmount?: number;
  monthBusinessCount?: number;
  unpaidCount: number;
  withVendorCount: number;
  waitingForCheckCount: number;
  waitingToPayVendorCount: number;
  reimbursedCount: number;
}

export interface SalesDashboard {
  businessAmount: number;
  businessCount: number;
  monthBusinessAmount: number;
  monthBusinessCount: number;
  corporateCount: number;
  inProgressCount: number;
  corporates: SalesCorporate[];
}

export interface SalesPaidBill {
  id: string;
  clientName: string;
  clientCode: string | null;
  vendorId: string | null;
  vendorName: string | null;
  vendorCode: string | null;
  billerName: string;
  consumerNumber: string;
  billNumber: string | null;
  amount: number;
  dueDate: string | null;
  paidAt: string;
  stage: string;
}

export interface SalesPaidReport {
  totalAmount: number;
  billCount: number;
  bills: SalesPaidBill[];
}

export interface SalesBill {
  id: string;
  billerName: string;
  consumerNumber: string;
  amount: number;
  dueDate: string | null;
  stage: string;
}

export interface OrganisationUser {
  id: string;
  phoneNumber: string;
  userCode: string;
  fullName: string;
  email: string | null;
  role: string;
  status: "ACTIVE" | "SUSPENDED";
  corporates?: AssignedCorporate[];
}

export interface AssignedCorporate {
  id: string;
  clientName: string;
  clientCode: string | null;
  status: string;
}

export interface UserBranch {
  id: string;
  name: string;
  code: string | null;
}

export interface ClientUser {
  id: string;
  phoneNumber: string;
  email?: string | null;
  userCode: string;
  fullName: string;
  role: string;
  status: "ACTIVE" | "SUSPENDED";
  branches?: UserBranch[];
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

/** A stored status. The known values stay for labels; any other value still type-checks and renders. */
export type OpenStatus<T extends string> = T | (string & {});

export type PaymentStatus = OpenStatus<"PROCESSING" | "PENDING" | "PAID" | "FAILED">;
export type BillLifecycleStatus = OpenStatus<"PROCESSING" | "DUE" | "PAID" | "FAILED">;
export type OrgStatus = OpenStatus<"NA" | "PENDING" | "IN_PROCESS" | "PAID">;
export type VendorStage = OpenStatus<"ASSIGNED" | "IN_PROGRESS" | "VENDOR_PAID" | "VERIFIED" | "REIMBURSED">;

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
  /** Only populated on Paytrix-wide view (lists every client's bills together). */
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
  branchId?: string | null;
  branchName?: string | null;
  createdByUserId?: string | null;
  createdByName?: string | null;
  createdByRole?: string | null;
  latestBillFetchId?: string | null;
}

export interface BillFetchRecord {
  billFetchId: string;
  billId: string;
  billAmount: number | null;
  billCycle: string | null;
  billDueDate: string | null;
  billGeneratedDate: string | null;
  billConsumerName: string | null;
  billStatus: string | null;
  billPaymentStatus: string | null;
  fetchedOn: string | null;
  fetchStatus: string | null;
  fetchRemarks: string | null;
  fetchProvider: string | null;
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
  assignedVendorClientId?: string | null;
  assignedVendorName?: string | null;
  commissionPercent?: number | null;
  commissionAmount?: number | null;
  vendorMarkedPaidAt?: string | null;
  vendorPaymentReference?: string | null;
  vendorStage?: VendorStage | null;
  bbpsVerifiedAt?: string | null;
  bbpsCheckNote?: string | null;
  reimbursedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  awaitingChecker?: boolean;
  canSettle?: boolean;
  branchId?: string | null;
  branchName?: string | null;
  hasPaymentProof?: boolean;
  corporateName?: string | null;
}

export interface CorpPayment {
  id: string;
  billFetchId: string;
  billId: string;
  billerName: string;
  categoryName: string;
  consumerNumber: string;
  dueDate: string | null;
  billCycle: string | null;
  branchId: string | null;
  branchName: string | null;
  billAmount: number;
  corpPaymentOn: string;
  corpId: string;
  corpName: string;
  corpPaidUserId: string | null;
  corpPaymentStatus: "PAID";
  billAssignedTo: "ORG" | "VENDOR";
  billAssignedToId: string;
  billAssignedToName: string;
  billAssignedToStatus: "PENDING" | "IN_PROGRESS";
  billAssignedOn: string;
  billPaidOn: string | null;
  transactionReferenceNumber: string | null;
  bbpsExternalReference: string | null;
  paymentProof: string | null;
  verifiedBy: string | null;
  verifiedById: string | null;
  verifiedOn: string | null;
  isVerified: boolean;
}

export interface ClientAccount {
  clientId: string;
  clientName: string;
  clientCode: string | null;
  clientType: ClientType;
  corporateKind: CorporateKind | null;
  status: "PENDING" | "ACTIVE" | "SUSPENDED" | "TERMINATED";
  legalName: string | null;
  registrationNumber: string | null;
  registeredAddress: string | null;
  signingAuthority: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  state?: string | null;
  location?: string | null;
  detailsSubmitted: boolean;
  kycStatus: "NOT_STARTED" | "PENDING" | "COMPLETE";
  contractStatus: "NOT_STARTED" | "PENDING" | "SIGNED";
}

export interface BillActivityLogEntry {
  eventType:
    | "CREATED"
    | "FETCH_SUCCESS"
    | "FETCH_FAILED_TRANSIENT"
    | "FETCH_FAILED_PERMANENT"
    | "CLIENT_PAID"
    | "ASSIGNED"
    | "VENDOR_IN_PROGRESS"
    | "VENDOR_MARKED_PAID"
    | "VENDOR_REJECTED"
    | "BBPS_VERIFIED"
    | "BBPS_STILL_DUE"
    | "VENDOR_REIMBURSED"
    | "COMMISSION_CLOSED"
    | "ORG_PICKED_UP"
    | "ORG_PAID"
    | "ORG_MARK_FAILED"
    | (string & {});
  description: string | null;
  actor: string | null;
  createdAt: string;
}

export interface BillLedgerEntry {
  walletType: "WALLET";
  entryType: "DEBIT" | "CREDIT";
  amount: number;
  balanceAfter: number;
  category: string;
  description: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface WalletBalance {
  walletBalance: number;
}

export interface LedgerEntryDto {
  entryType: "DEBIT" | "CREDIT";
  amount: number;
  balanceAfter: number;
  category: string;
  description: string | null;
  createdBy: string | null;
  createdAt: string;
}

export type PaymentMode = "RTGS" | "NEFT" | "UPI" | "CASH" | "OTHER";

export interface WalletTopup {
  id: string;
  amount: number;
  paymentMode: PaymentMode;
  paymentReference: string | null;
  hasProof: boolean;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  createdBy?: string | null;
  approvedBy?: string | null;
  approvedOn?: string | null;
  remarks?: string | null;
  canReview?: boolean;
}

/** Same as WalletTopup, plus which client it's for - only returned by Paytrix-wide pending list. */
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

/** Same as SupportTicket, plus which client it's for - only returned by Paytrix-wide list. */
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
  branchCount?: number;
  userCount?: number;
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

export interface FundingRow {
  id: string;
  clientId: string;
  clientName: string;
  clientCode: string | null;
  amount: number;
  paymentMode: PaymentMode;
  status: "PENDING" | "APPROVED" | "REJECTED";
  paymentReference: string | null;
  requestedBy: string | null;
  reviewedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VendorCategoryPaidRow {
  category: string;
  bills: number;
  amount: number;
}

export interface VendorAwaitingRow {
  billId: string;
  category: string;
  corporateName: string | null;
  amount: number;
  paidOn: string | null;
}

export interface VendorCommissionPaidRow {
  billId: string;
  category: string;
  billAmount: number;
  commissionPercent: number | null;
  commissionAmount: number;
  paidOn: string | null;
}

export interface VendorCommissionReportRow {
  vendorId: string;
  vendorName: string;
  commissionEarned: number;
  commissionPending: number;
}

export interface TransactionCategoryRow {
  what: string;
  moneyIn: number;
  moneyOut: number;
}

export interface CorporateBusinessRow {
  corpId: string;
  corpName: string;
  billsRaised: number;
  raisedAmount: number;
  billsPaid: number;
  paidAmount: number;
}

export interface SalesBusinessRow {
  salesUserId: string;
  salesPersonName: string;
  corpId: string | null;
  corpName: string | null;
  billsPaid: number;
  paidAmount: number;
  salesBillsPaid: number;
  salesPaidAmount: number;
}

export interface VendorBusinessRow {
  vendorId: string;
  vendorName: string;
  billsAssigned: number;
  assignedAmount: number;
  billsPaid: number;
  paidAmount: number;
}

export interface VerifiedVendorPaymentRow {
  corpId: string;
  corpName: string;
  paidById: string;
  paidByName: string;
  billId: string;
  billAmount: number;
  paidOn: string;
}

export interface BranchBillsRow {
  branchId: string;
  branchName: string;
  billId: string | null;
  billAmount: number | null;
  branchBills: number;
  branchTotal: number;
}

export interface SpendByServiceRow {
  billServiceCode: string;
  billServiceName: string;
  count: number;
  amount: number;
}

export function homeForUser(
  user: Pick<UserProfile, "portal" | "role">,
): string {
  if (user.portal === "VENDOR") return "/vendor/dashboard";
  if (user.portal === "CORPORATE") return "/client/dashboard";
  if (user.role === "SALES") return "/paytrix/sales";
  return "/paytrix/dashboard";
}
