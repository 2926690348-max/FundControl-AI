export interface PaymentNode {
  nodeName: string;
  percentage: number;
  amount: number;
  triggerCondition: string;
  estimatedDaysAfterTrigger: number;
}

export interface ContractData {
  contractNumber: string;
  supplierName: string;
  contractAmount: number;
  productInfo: string;
  paymentNodes: PaymentNode[];
  creditTerms: string;
  expectedPickupDate: string;
  expectedDeliveryDate: string;
  expectedPaymentDate: string;
}

export interface ParserResponse {
  success: boolean;
  source: "gemini" | "simulator";
  data: ContractData;
  confidence: {
    contractNumber: number;
    supplierName: number;
    contractAmount: number;
    paymentNodes: number;
    dates: number;
  };
}

export interface SystemData {
  srm: {
    poNumber: string;
    poAmount: number;
    orderStatus: string;
    unitPrice: number;
    quantity: number;
  };
  erp: {
    paidAmount: number;
    unpaidAccountsPayable: number;
    advancePaymentDate?: string;
  };
  wms: {
    receivedQty: number;
    warehouseId: string;
    receivedStatus: string;
  };
  logistics: {
    shipmentStatus: string;
    carrier: string;
    currentLocation: string;
    estimatedArrival: string;
  };
}

export interface Discrepancy {
  system: string;
  field: string;
  contractValue: string;
  systemValue: string;
  severity: "success" | "info" | "warning" | "medium" | "danger" | "high";
  description: string;
}

export interface SystemMatchResponse {
  success: boolean;
  hasMatch: boolean;
  systems: SystemData;
  discrepancies: Discrepancy[];
}

export interface UserPersona {
  role: string;
  title: string;
  avatar: string;
  scenario: string;
  painPoints: string[];
  aiSolution: string;
}

export interface CashPlanItem {
  id: string;
  contractNo: string;
  supplier: string;
  purpose: string;
  amount: number;
  plannedDate: string;
  status: "待提报" | "待审批" | "已审批" | "已下达" | "已付款";
  riskLevel: "low" | "medium" | "high";
  riskReason?: string;
}
