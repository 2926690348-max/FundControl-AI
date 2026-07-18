import React, { useState, useEffect } from "react";
import {
  FileText,
  LayoutDashboard,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  Coins,
  Users,
  ShieldCheck,
  CheckCircle,
  Calendar,
  ArrowRight,
  Search,
  Database,
  Truck,
  Info,
  Calculator,
  Plus,
  HelpCircle,
  Clock,
  ArrowUpRight,
  FileSpreadsheet,
  Layers,
  Edit2,
  Check,
  Building,
  UserCheck,
  Workflow,
  Cpu,
  Upload,
  Paperclip,
  Eye,
  X
} from "lucide-react";
import { ContractData, CashPlanItem, SystemData, Discrepancy } from "./types";
import { parseDocx, parseXlsx, fileToBase64 } from "./fileParser";

// Static User Personas Data
const USER_PERSONAS = [
  {
    role: "财务主管 / 资金总监",
    title: "掌控资金血脉，要求极致准确与风险可控",
    avatar: "👩‍💼",
    scenario: "月度滚动资金计划编制、大额付款审批、资金头寸错配预警及融资计划安排。",
    painPoints: [
      "Excel 手工汇总各大业务板块提报的付款计划，容易漏报、重报或填报口径不一。",
      "无法及时获取前序合同约定及物流到港节点，资金需求往往在付款临门一脚才知道，缺乏前瞻性。"
    ],
    aiSolution: "通过大模型全自动解析采购合同付款节点，结合WMS和物流系统在线动态校准付款窗口，自动生成滚动30天资金流量需求，将Excel手工汇总的5天工作量压缩到5分钟，预测准确率提升至95%以上。"
  },
  {
    role: "采购经理 / 采购人员",
    title: "确保物资按时到货，频繁面对付款催单",
    avatar: "🧑‍💻",
    scenario: "合同签订、SRM采购订单下发、跟进供应商发货进度、协助供应商申请货款。",
    painPoints: [
      "手工在SRM和ERP系统反复录入合同条款及应付账款，效率极低且极易出错。",
      "无法随时掌握自己所管辖合同的付款排期，常常被供应商催款，业财协同全靠打电话。"
    ],
    aiSolution: "合同签订后，AI自动提取核心条款写入ERP并自动生成付款计划，采购无需重复录入。系统直接对齐物流和WMS自动更新付款准备度，进度透明，极大减少与财务的对账沟通成本。"
  },
  {
    role: "业务部门 / 生产项目经理",
    title: "项目按期投产，关注资金保障度",
    avatar: "👨‍🏭",
    scenario: "提报项目物料采购需求，确认项目提货与进厂施工进度。",
    painPoints: [
      "项目执行阶段，不知道合同预付款或进度款是否已按约定支付，影响项目进度。",
      "由于交货期发生变动，手工调整后续付款计划非常繁琐，导致预测失真。"
    ],
    aiSolution: "当项目进度或交货时间变动时，系统通过智能Agent捕获变更，自动重新测算付款节点并推送至资金系统进行额度预算微调，保障核心生产资料资金及时拨付。"
  },
  {
    role: "集团 CFO / 决策层",
    title: "提升资金使用效率，降低资本占用成本",
    avatar: "👨‍💼",
    scenario: "审批集团核心大额资金调度、监控集团资金链健康度、调配跨境资金头寸。",
    painPoints: [
      "缺乏统一、透明的资金全景视图，难以穿透到底层业务合同来评估真实的付款风险。",
      "财务被动付款导致资金冗余度高、头寸沉淀严重，集团融资占用成本居高不下。"
    ],
    aiSolution: "提供集团业财一体化资金滚动预测看板，实时穿透物流、仓储、生产进度与合同细节，大幅压缩资金冗余度，辅助决策，将冗余资金沉淀降低30%以上。"
  }
];

export default function App() {
  // File Upload State Engine with Multi-file support, smart Filter and Classifier
  interface UploadedFileItem {
    id: string;
    name: string;
    size: number;
    type: string;
    base64?: string;
    rawText?: string;
    isImage: boolean;
    isOcrScanning: boolean;
    status: "idle" | "decoding" | "classifying" | "completed" | "error";
    isContract: boolean; // filter outcome
    classification: "payment_terms" | "signatures" | "general_terms" | "non_contract" | "excel_sheet" | "word_doc"; // classifier outcome
    importance: "high" | "medium" | "low" | "none";
    rejectionReason?: string;
  }

  const [activeTab, setActiveTab] = useState<"demo" | "blueprint">("demo");
  const [demoSubTab, setDemoSubTab] = useState<"dashboard" | "parser" | "integration" | "collaboration">("dashboard");
  const [selectedPreset, setSelectedPreset] = useState<string>("fixed_price");
  const [customContractText, setCustomContractText] = useState<string>("");
  const [parsedResult, setParsedResult] = useState<ContractData | null>(null);
  const [confidence, setConfidence] = useState<number>(0);
  const [isParsingSuccess, setIsParsingSuccess] = useState<boolean>(false);
  const [parsingLoading, setParsingLoading] = useState<boolean>(false);
  const [parsingLogs, setParsingLogs] = useState<string[]>([]);
  const [apiConfig, setApiConfig] = useState<{ hasGeminiApiKey: boolean; hasCustomApiKey: boolean; customModel?: string }>({ hasGeminiApiKey: false, hasCustomApiKey: false });
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editedFields, setEditedFields] = useState<any>({});
  const [parserSource, setParserSource] = useState<string>("gemini");
  const [parserModel, setParserModel] = useState<string>("gemini-3.5-flash");
  
  const [showBase64Modal, setShowBase64Modal] = useState<boolean>(false);
  const [fileBase64, setFileBase64] = useState<string>("");
  const [isImage, setIsImage] = useState<boolean>(false);
  const [isOcrScanning, setIsOcrScanning] = useState<boolean>(false);
  const [uploadedFile, setUploadedFile] = useState<any | null>(null);

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileItem[]>([]);
  const [activeFileIdForBase64, setActiveFileIdForBase64] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Translate classification tags for UI display
  const translateClassification = (cls: string) => {
    switch (cls) {
      case "payment_terms": return "核心账期付款条款页";
      case "signatures": return "印章授权双签页";
      case "general_terms": return "一般通用合同条文页";
      case "excel_sheet": return "结算工作表 (Excel)";
      case "word_doc": return "合同大纲提纯 (Word)";
      case "non_contract": return "非合同干扰单据";
      default: return "未分类文档";
    }
  };

  // Translate importance values
  const translateImportance = (imp: string) => {
    switch (imp) {
      case "high": return "高重要度 (提取权重100%)";
      case "medium": return "中重要度 (结构化提取)";
      case "low": return "低重要度 (法务条文参考)";
      case "none": return "无 (已被安全过滤拦截)";
      default: return "普通关注";
    }
  };

  // Automated compiler to concatenate all accepted file contents into customContractText
  useEffect(() => {
    if (uploadedFiles.length > 0) {
      const validFiles = uploadedFiles.filter(f => f.isContract && f.status === "completed");
      if (validFiles.length > 0) {
        const compiledText = validFiles.map((file, idx) => {
          const transCls = translateClassification(file.classification);
          const transImp = translateImportance(file.importance);
          return `==================================================\n📄 [合同多图流合并 - 页面 ${idx + 1}] : ${file.name}\n🏷️ 分类: ${transCls} | 权重: ${transImp}\n==================================================\n\n${file.rawText || "（空文件）"}`;
        }).join("\n\n\n");
        setCustomContractText(compiledText);
      } else {
        setCustomContractText("");
      }
    } else {
      setCustomContractText("");
    }
  }, [uploadedFiles]);

  const handleMultiFileUpload = async (files: FileList | File[]) => {
    setUploadError(null);
    setSelectedPreset("custom");
    setParsingLoading(true);
    setParsingLogs(["⚡ 启动智能多模态分发和分类过滤对齐引擎..."]);

    const newItems: UploadedFileItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const id = `file_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 4)}`;
      const isImg = file.type.startsWith("image/");
      
      newItems.push({
        id,
        name: file.name,
        size: file.size,
        type: file.type,
        isImage: isImg,
        isOcrScanning: false,
        status: "idle",
        isContract: true,
        classification: "general_terms",
        importance: "low"
      });
    }

    setUploadedFiles(prev => [...prev, ...newItems]);

    const processedFiles: { name: string; isContract: boolean; classification: any; importance: any; rawText: string }[] = [];

    // Process each file sequentially with interactive delays for realistic AI feel
    for (const item of newItems) {
      const file = Array.from(files).find(f => f.name === item.name);
      if (!file) continue;

      // Stage 1: Base64/Raw Decoding
      setUploadedFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: "decoding", isOcrScanning: true } : f));
      setParsingLogs(prev => [...prev, `📂 [转码通道] 正在对 ${file.name} 执行二进制字节对齐与 Base64 解码编码...`]);
      
      await new Promise(r => setTimeout(r, 600));

      let base64 = "";
      let rawText = "";
      const fileType = file.name.split('.').pop()?.toLowerCase();

      try {
        if (item.isImage) {
          base64 = await fileToBase64(file);
        } else if (fileType === "xlsx" || fileType === "xls") {
          rawText = await parseXlsx(file);
        } else if (fileType === "docx") {
          rawText = await parseDocx(file);
        } else {
          rawText = await file.text();
        }

        // Stage 2: Classifier and Intelligent Filter Scanning
        setUploadedFiles(prev => prev.map(f => 
          f.id === item.id 
            ? { ...f, status: "classifying", base64, rawText: rawText || undefined } 
            : f
        ));
        setParsingLogs(prev => [...prev, `🔬 [版面分类与安全过滤器] 正在对 ${file.name} 进行高保真识别与智能合规研判...`]);

        await new Promise(r => setTimeout(r, 1000));

        let isContract = true;
        let classification: "payment_terms" | "signatures" | "general_terms" | "non_contract" | "excel_sheet" | "word_doc" = "general_terms";
        let importance: "high" | "medium" | "low" | "none" = "low";
        let rejectionReason = "";
        let extractedText = rawText || "";

        try {
          const res = await fetch("/api/analyze-uploaded-file", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileType: item.isImage ? "image" : "text",
              fileName: file.name,
              base64: base64 || undefined,
              rawText: rawText || undefined,
              mimeType: file.type
            })
          });
          const resData = await res.json();
          if (resData.success && resData.data) {
            isContract = resData.data.isContract;
            classification = resData.data.classification;
            importance = resData.data.importance;
            rejectionReason = resData.data.rejectionReason;
            extractedText = resData.data.rawText;
          }
        } catch (apiErr) {
          console.warn("API analysis failed, using client fallback", apiErr);
          const lowerName = file.name.toLowerCase();

          if (item.isImage) {
            if (
              lowerName.includes("invoice") || 
              lowerName.includes("fapiao") || 
              lowerName.includes("lunch") || 
              lowerName.includes("dog") || 
              lowerName.includes("cat") || 
              lowerName.includes("food") || 
              lowerName.includes("shouju") || 
              lowerName.includes("发票") || 
              lowerName.includes("收据") || 
              lowerName.includes("外卖") || 
              lowerName.includes("生活照") ||
              (lowerName.includes("receipt") && !lowerName.includes("contract") && !lowerName.includes("agree"))
            ) {
              isContract = false;
              classification = "non_contract";
              importance = "none";
              rejectionReason = "此图像特征或文件名匹配日常杂质/消费票据/生活照片。已自动触发安全拦截器，防止噪声数据污染大语言模型的提取任务。";
              extractedText = `【防造干扰拦截页面 - ${file.name}】\n内容提示：已被智能过滤器拦截阻断。原因：不具备采购、供应、财务付款或印章签署任何合同特征要素。`;
            } else if (
              lowerName.includes("sign") || 
              lowerName.includes("stamp") || 
              lowerName.includes("seal") || 
              lowerName.includes("gaizhang") || 
              lowerName.includes("qianzhang") || 
              lowerName.includes("签字") || 
              lowerName.includes("盖章") || 
              lowerName.includes("印章") ||
              lowerName.includes("授权") ||
              lowerName.includes("末页") ||
              lowerName.includes("尾页")
            ) {
              classification = "signatures";
              importance = "high";
              extractedText = `【高保真OCR识别结果 - 合同签署/授权印章页】\n甲方：上海宝聚重工集团有限公司\n法定代表人授权签字：张宝聚 （已盖公司合同专用章、公章）\n乙方：沈阳机床股份有限公司\n法定代表人授权签字：李机床 （已盖公司公章、财务专用章）\n签署日期：2026年7月15日\n校验：骑缝章匹配良好。`;
            } else if (
              lowerName.includes("pay") || 
              lowerName.includes("price") || 
              lowerName.includes("money") || 
              lowerName.includes("amount") || 
              lowerName.includes("node") || 
              lowerName.includes("fukuan") || 
              lowerName.includes("付款") || 
              lowerName.includes("账期") || 
              lowerName.includes("金额") ||
              lowerName.includes("第3页") ||
              lowerName.includes("page3")
            ) {
              classification = "payment_terms";
              importance = "high";
              extractedText = `【高保真OCR识别结果 - 采购合同核心款项约定】\n合同编号：HT-2026-MULTI-07\n买方（甲方）：上海宝聚重工集团有限公司\n卖方（乙方）：沈阳机床股份有限公司\n一、设备清单及价格：\nVMC850B 型立式加工中心两台，含税总价共计：8,000,000.00 元（大写：捌佰万元整）。\n二、付款阶段约定：\n1. 合同签字盖章生效后 3 个工作日内，甲方向乙方支付总价 of 20%（即 ¥ 1,600,000.00）作为项目启动预付款。\n2. 全套机床运至甲方指定 1 号仓库完成初步安装并凭收货凭证及乙方出具的增值税专用发票，甲方向乙方支付合同总金额的 50%（即 ¥ 4,000,000.00）。\n3. 机床正式联动调试完成并经过双方技术组签字验收合格满 30 个工作日后，支付剩余 of 30%（即 ¥ 2,400,000.00）作为结算尾款。\n三、预计交货及提货日期：\n乙方负责运至指定地点，提货日为2026-08-01，到货日为2026-08-10。`;
            } else {
              classification = "general_terms";
              importance = "low";
              extractedText = `【高保真OCR识别结果 - 合同一般性条款】\n一、运输保险：由乙方负责运送并承担相关保险。\n二、争议解决：任何由此合同产生的法律诉讼纠纷均由甲方所在地人民法院管辖。\n三、保密协议：双方对本商务合同约定的定价公式、设备参数承担长期保密责任，期限为5年。`;
            }
          } else if (fileType === "xlsx" || fileType === "xls") {
            classification = "excel_sheet";
            importance = "medium";
            extractedText = rawText;
          } else if (fileType === "docx") {
            classification = "word_doc";
            importance = "medium";
            extractedText = rawText;
          } else {
            classification = "general_terms";
            importance = "low";
            extractedText = rawText;
          }
        }

        processedFiles.push({
          name: file.name,
          isContract,
          classification,
          importance,
          rawText: extractedText
        });

        // Finalize state for the file
        setUploadedFiles(prev => prev.map(f => 
          f.id === item.id 
            ? { 
                ...f, 
                status: "completed", 
                isOcrScanning: false,
                isContract, 
                classification, 
                importance, 
                rejectionReason: rejectionReason || undefined,
                rawText: extractedText 
              } 
            : f
        ));

        if (isContract) {
          setParsingLogs(prev => [...prev, `✅ [安全过滤器] ${file.name} 审核通过。分类标签：【${translateClassification(classification)}】，高保真 OCR 文本对齐已就绪！`]);
        } else {
          setParsingLogs(prev => [...prev, `⚠️ [拦截屏蔽] 检测到干扰项：${file.name}，原因：${rejectionReason}`]);
        }

      } catch (err: any) {
        console.error(err);
        setUploadedFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: "error", isOcrScanning: false } : f));
        setParsingLogs(prev => [...prev, `❌ [失败] 文件读取错误 ${file.name}: ${err.message || "未知错误"}`]);
      }
    }

    setParsingLoading(false);

    // Auto run compilation and execute AI LLM analysis immediately
    const validProcessed = processedFiles.filter(f => f.isContract);
    if (validProcessed.length > 0) {
      const compiledText = validProcessed.map((file, idx) => {
        const transCls = translateClassification(file.classification);
        const transImp = translateImportance(file.importance);
        return `==================================================\n📄 [合同多图流合并 - 页面 ${idx + 1}] : ${file.name}\n🏷️ 分类: ${transCls} | 权重: ${transImp}\n==================================================\n\n${file.rawText || "（空文件）"}`;
      }).join("\n\n\n");
      
      setCustomContractText(compiledText);
      setParsingLogs(prev => [...prev, "🚀 [合并编译] 多图合同文本已自动编译，正在启动智能大模型解析流..."]);
      await handleTriggerParse(compiledText, "custom");
    }
  };

  const loadDemoMultiFiles = () => {
    setUploadError(null);
    setSelectedPreset("custom");
    setParsingLoading(true);
    setParsingLogs([
      "⚡ 正在加载官方多图合同测试组合包(含干扰拦截过滤示范)...",
      "🔬 提示：本测试包模拟了真实财务审核中的常见场景——多张合同图像与误上传的生活发票混合进行批量分类和拦截。"
    ]);

    const demoFiles: UploadedFileItem[] = [
      {
        id: "demo_file_1",
        name: "沈阳机床采购合同_第3页_款项与账期约定.png",
        size: 245800,
        type: "image/png",
        isImage: true,
        isOcrScanning: false,
        status: "completed",
        isContract: true,
        classification: "payment_terms",
        importance: "high",
        base64: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEgAACxIB0t1+/AAAABZ0RVh0Q3JlYXRpb24gVGltZQAwNy8xNi8yNkuZTYMAAAAhdEVYdFNvZnR3YXJlAEFkb2JlIEZpcmV3b3JrcyBDUzYstGdjAAABV0lEQVR4nO3BMQEAAADCoPVPbQ0PoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMBvAAY6AAFZ6P7lAAAAAElFTkSuQmCC",
        rawText: `【高保真OCR识别结果 - 采购合同核心款项约定】\n合同编号：HT-2026-MULTI-07\n买方（甲方）：上海宝聚重工集团有限公司\n卖方（乙方）：沈阳机床股份有限公司\n一、设备名称、规格数量、金额：\nVMC850B 型立式加工中心两台，含税总价共计：8,000,000.00 元（大写：捌佰万元整）。\n二、付款节点及条件：\n1. 合同签字盖章生效后 3 个工作日内，甲方向乙方支付总价的 20%（即 ¥ 1,600,000.00）作为项目启动预付款。\n2. 全套机床运至甲方指定 1 号仓库完成初步安装并凭收货凭证及乙方出具的增值税专用发票，甲方向乙方支付合同总金额 of 50%（即 ¥ 4,000,000.00）。\n3. 机床正式联动调试完成并经过双方技术组签字验收合格满 30 个工作日后，支付剩余的 30%（即 ¥ 2,400,000.00）作为设备结算尾款。\n三、提货与到货日期安排：\n乙方负责将机床运抵现场，预计提货日期为 2026年8月1日，预计到货日期为 2026年8月10日。`
      },
      {
        id: "demo_file_2",
        name: "合同第12页_双向授权公章签字.png",
        size: 189000,
        type: "image/png",
        isImage: true,
        isOcrScanning: false,
        status: "completed",
        isContract: true,
        classification: "signatures",
        importance: "high",
        base64: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEgAACxIB0t1+/AAAABZ0RVh0Q3JlYXRpb24gVGltZQAwNy8xNi8yNkuZTYMAAAAhdEVYdFNvZnR3YXJlAEFkb2JlIEZpcmV3b3JrcyBDUzYstGdjAAABV0lEQVR4nO3BMQEAAADCoPVPbQ0PoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMBvAAY6AAFZ6P7lAAAAAElFTkSuQmCC",
        rawText: `【高保真OCR识别结果 - 合同签署/授权印章页】\n甲方签字代表：张宝聚（董事长兼首席执行官）\n乙方签字代表：李机床（沈阳机床授权财务负责人）\n签署单位甲：上海宝聚重工集团有限公司（公章、合同专用章已盖，骑缝章相符）\n签署单位乙：沈阳机床股份有限公司（公章、财务专用章已盖，骑缝章相符）\n签署日期：2026年7月15日`
      },
      {
        id: "demo_file_3",
        name: "中午和同事聚餐发票报销凭证.jpg",
        size: 95400,
        type: "image/jpeg",
        isImage: true,
        isOcrScanning: false,
        status: "completed",
        isContract: false,
        classification: "non_contract",
        importance: "none",
        rejectionReason: "该文件指纹对应于餐饮日常发票收据，并非正式交易采购合同，不具备任何合同要素。智能过滤器已自动拦截此页，防止其噪声带入大语言模型导致财务账期计算偏差。",
        base64: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEgAACxIB0t1+/AAAABZ0RVh0Q3JlYXRpb24gVGltZQAwNy8xNi8yNkuZTYMAAAAhdEVYdFNvZnR3YXJlAEFkb2JlIEZpcmV3b3JrcyBDUzYstGdjAAABV0lEQVR4nO3BMQEAAADCoPVPbQ0PoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMBvAAY6AAFZ6P7lAAAAAElFTkSuQmCC",
        rawText: "【高保真OCR识别结果 - 拦截页面】商家名称：老北京麻辣香锅，实付金额：¥ 56.50元，消费日期：2026年7月15日"
      }
    ];

    setTimeout(() => {
      setUploadedFiles(demoFiles);
      setParsingLogs([
        "✅ 成功一键加载多图测试组合包！",
        "📂 已自动在客户端完成 Base64 提取，并并行调用大模型分类器/过滤器：",
        " ├─ 📄 沈阳机床合同付款页 (判定：【核心账期付款条款页】 | 重点关注 ✅)",
        " ├─ 📄 合同双签授权公章页 (判定：【印章授权双签页】 | 重点关注 ✅)",
        " └─ 📄 中午聚餐发票报销凭证 (判定：【非合同干扰单据】 | 智能拦截安全屏蔽 ❌)",
        "💡 体验反馈：大模型分析多张图片时，正是将有效的 Base64 字节流连同其分类标签，打包合并发送至服务端的！请点击底部【运行智能 AI 合同解析】体验最终排程！"
      ]);
      setParsingLoading(false);
    }, 1200);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleMultiFileUpload(e.dataTransfer.files);
    }
  };
  // Cross-system Data alignment state
  const [systemMatchLoading, setSystemMatchLoading] = useState(false);
  const [alignedSystems, setAlignedSystems] = useState<SystemData | null>(null);
  const [discrepancies, setDiscrepancies] = useState<Discrepancy[]>([]);
  const [hasAligned, setHasAligned] = useState(false);
  
  // Global cash plan list (State updated by simulation actions)
  const [cashPlans, setCashPlans] = useState<CashPlanItem[]>([
    { id: "CP-001", contractNo: "HT-2026-STEEL-089", supplier: "江苏德龙镍业有限公司", purpose: "国标热轧卷板（首批到货款）", amount: 8400000.00, plannedDate: "2026-08-20", status: "待审批", riskLevel: "low" },
    { id: "CP-002", contractNo: "HT-2026-STEEL-089", supplier: "江苏德龙镍业有限公司", purpose: "国标热轧卷板（预付款）", amount: 6300000.00, plannedDate: "2026-07-20", status: "已付款", riskLevel: "low" },
    { id: "CP-003", contractNo: "HT-2026-ORE-102", supplier: "力拓矿业（中国）有限公司", purpose: "铁矿石到港信用款", amount: 6800000.00, plannedDate: "2026-08-19", status: "待审批", riskLevel: "medium", riskReason: "普氏价格指数上涨，最终结算款预计增加约15万元" },
    { id: "CP-004", contractNo: "HT-2026-IT-FRAME", supplier: "联想（北京）有限公司", purpose: "IT设备采购单（批次1）", amount: 600000.00, plannedDate: "2026-09-05", status: "待提报", riskLevel: "low" },
    { id: "CP-005", contractNo: "HT-2026-MECH-331", supplier: "沈阳第一机床厂", purpose: "大型数控机床中款", amount: 4500000.00, plannedDate: "2026-08-12", status: "待审批", riskLevel: "high", riskReason: "沈阳机床厂交货可能延迟15天，付款日期需后延避开资金紧张期" },
  ]);

  // Rolling scenario sliders
  const [logisticsDelayDays, setLogisticsDelayDays] = useState(0);
  const [materialPriceMultiplier, setMaterialPriceMultiplier] = useState(1.0);
  const [interestRate, setInterestRate] = useState(1.5); // Opp cost of capital

  // ROI Calculator states
  const [roiContracts, setRoiContracts] = useState(1200);
  const [roiManualTime, setRoiManualTime] = useState(90); // mins
  const [roiSalary, setRoiSalary] = useState(15000); // RMB
  const [roiCapitalHold, setRoiCapitalHold] = useState(1.5); // %

  // Load contract presets on mount
  const contractPresets = {
    fixed_price: `合同编号：HT-2026-STEEL-089
甲方：上海宝聚重工集团有限公司
乙方：江苏德龙镍业有限公司
一、交易标的及金额
本合同约定采购国标热轧卷板，总量 5000 吨，单价 4200 元/吨（含税），合同总金额为人民币 21,000,000.00 元（大写：贰仟壹佰万元整）。
二、交货时间与物料安排
乙方需在 2026 年 8 月 15 日前完成首批 2500 吨提货，并于 2026 年 8 月 20 日前通过海运方式运抵甲方指定 WMS 2号仓库（上海港）。剩余 2500 吨于 2026 年 9 月 15 日前完成到货。
三、付款方式及节点
1. 预付款：合同签订之日起 5 个工作日内，甲方支付合同总金额 of 30% 作为预付款，即人民币 6,300,000.00 元。
2. 到货款：首批物资到货验收合格后 10 个工作日内，凭发票及收货确认书支付合同总金额的 40%，即人民币 8,400,000.00 元。
3. 尾款：全部物资到货且质保期满 30 天（信用账期 30 天）后支付剩余 30% 尾款，即人民币 6,300,000.00 元。
四、违约责任与延迟付款
若到货延迟，每延迟一日，乙方需支付合同总额万分之五的违约金。`,
    variable_price: `合同编号：HT-2026-ORE-102
甲方：山东钢铁集团有限公司
乙方：力拓矿业（中国）有限公司
一、交易内容
甲方从乙方采购高品位铁矿石 10,000 吨。单价采用“暂估价格+后期结算”模式。暂估单价为 850 元/吨（含税），预计总价为 8,500,000.00 元。最终价格以 2026 年 8 月 10 日普氏铁矿石指数均价为准进行结算。
二、信用账期与到货
乙方于 2026 年 8 月 5 日将货物运抵青岛港指定堆场。甲方在货物到港并取得第三方检验报告后，给予乙方 15 天信用账期（预计付款窗口为 2026 年 8 月 20 日左右）。
三、付款节点约定
1. 信用提货款：到货验收合格后 5 个工作日内支付暂估总价的 80%，即 6,800,000.00 元。
2. 最终结算款：在 2026 年 8 月 15 日前完成价格最终审计，并在 8 月 20 日前付清剩余结算尾款。`,
    framework: `合同编号：HT-2026-IT-FRAME
甲方：平安科技（深圳）有限公司
乙方：联想（北京）有限公司
一、合同性质
本合同为 2026 年度 IT 设备及终端采购框架协议。不约定具体交易总量。具体采购内容、单价、交货期以甲方通过 SRM 系统下发的《采购订单（PO）》为准。
二、付款条件（标准账期）
本框架协议项下所有采购订单，均执行“月度结账，账期 45 天（M+45）”的付款条件。即每个自然月结束后，双方于次月 5 日前核对已到货并开票的设备总额，核对无误后，甲方在 45 天内（预计次月 20 日前）通过银行承兑汇票或电汇方式支付。
三、物料交期
单笔采购订单下发后，乙方须在 7 个工作日内送达平安科技各分支机构，并由分支机构在 WMS 系统进行收货确认。`
  };

  // Run initial extraction for Fixed Price as default to fill states smoothly
  useEffect(() => {
    // Fetch system configurations (such as custom LLM endpoints)
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        setApiConfig(data);
      })
      .catch((err) => console.error("Error fetching api config:", err));

    handleTriggerParse(contractPresets.fixed_price, "fixed_price", true);
  }, []);

  const handlePresetSelect = (presetKey: "fixed_price" | "variable_price" | "framework" | "custom") => {
    setSelectedPreset(presetKey);
    setHasAligned(false);
    setAlignedSystems(null);
    setDiscrepancies([]);
    if (presetKey !== "custom") {
      handleTriggerParse(contractPresets[presetKey], presetKey, false);
    } else {
      setParsedResult(null);
      setIsParsingSuccess(false);
    }
  };

  const handleTriggerParse = async (text: string, type: string, isInitial = false) => {
    if (!text.trim()) return;
    setParsingLoading(true);
    setParsingLogs([]);
    setIsParsingSuccess(false);

    // Determine engine label based on active config
    const activeEngine = apiConfig.hasCustomApiKey 
      ? `小米Mimo大模型 (${apiConfig.customModel})` 
      : apiConfig.hasGeminiApiKey 
        ? "Gemini-3.5-flash" 
        : "本地模拟引擎";

    // Simulated logs to reflect modern AI product PM workflow
    const logs = [
      `🤖 正在唤醒服务端大模型解析引擎 [${activeEngine}]...`,
      "🔍 正在读取非结构化文本合同，执行高保真版面分析与OCR配准...",
      "🏷️ 识别到关键主体：上海宝聚重工、江苏德龙、力拓矿业、联想...",
      "⛓️ 正在解析非线性付款条款，拆分付款比例与触发逻辑...",
      "📅 基于财务规则链推演账期，换算预计付款、交期及信用到货日...",
      "📊 结构化清洗完成，正在生成资金计划初稿 JSON 结构体..."
    ];

    if (!isInitial) {
      for (let i = 0; i < logs.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 400));
        setParsingLogs(prev => [...prev, logs[i]]);
      }
    }

    try {
      const response = await fetch("/api/parse-contract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractText: text, contractType: type }),
      });
      const resData = await response.json();
      if (resData.success) {
        setParsedResult(resData.data);
        setConfidence(resData.confidence);
        setEditedFields(resData.data);
        setParserSource(resData.source || "gemini");
        setParserModel(resData.model || "gemini-3.5-flash");
        setIsParsingSuccess(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setParsingLoading(false);
    }
  };

  const handleTriggerSystemMatch = async () => {
    if (!parsedResult) return;
    setSystemMatchLoading(true);
    // Simulate API pipeline delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      const response = await fetch("/api/system-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractNumber: parsedResult.contractNumber }),
      });
      const resData = await response.json();
      if (resData.success) {
        setAlignedSystems(resData.systems);
        setDiscrepancies(resData.discrepancies);
        setHasAligned(true);
        setDemoSubTab("integration");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSystemMatchLoading(false);
    }
  };

  const handleSaveField = (fieldName: string, value: any) => {
    if (!parsedResult) return;
    const updated = { ...parsedResult, [fieldName]: value };
    setParsedResult(updated);
    setEditedFields(updated);
    setIsEditing(null);
  };

  const handleCalibrateAndAdjustPlans = () => {
    if (!parsedResult || !alignedSystems) return;

    // Based on the aligned data, we can "calibrate" the plans
    const updatedPlans = [...cashPlans];

    // Find steel contract payment node and adjust based on delay
    if (parsedResult.contractNumber === "HT-2026-STEEL-089") {
      const idx = updatedPlans.findIndex(p => p.contractNo === "HT-2026-STEEL-089" && p.status === "待审批");
      if (idx !== -1) {
        // Adjust the planned date due to logistics delay or logistics ETA
        updatedPlans[idx].plannedDate = "2026-08-25"; // calibrated to match in-transit
        updatedPlans[idx].riskReason = "已根据最新物流ETA(2026-08-20)及10个工作日账期，自动向后滚动付款排程 5 天，节省资金占用成本约 3,250 元";
        updatedPlans[idx].riskLevel = "low";
      }
    } else if (parsedResult.contractNumber === "HT-2026-ORE-102") {
      const idx = updatedPlans.findIndex(p => p.contractNo === "HT-2026-ORE-102" && p.status === "待审批");
      if (idx !== -1) {
        updatedPlans[idx].plannedDate = "2026-08-19"; // early delivery
        updatedPlans[idx].amount = 6800000.00 * materialPriceMultiplier; // price fluctuation applied
        updatedPlans[idx].riskReason = "检测到WMS货物提前于8-04入库，付款日自动前调至8-19。根据当前铁矿石普氏均价乘数动态修正到货款额度。";
      }
    }

    setCashPlans(updatedPlans);
    alert("✨ AI 业财多源校准成功！已自动调整相关付款节点及计划排期，动态数据同步推送至总控看板。");
    setDemoSubTab("dashboard");
  };

  const handleApprovePlan = (id: string) => {
    setCashPlans(prev => prev.map(p => p.id === id ? { ...p, status: "已审批" } : p));
  };

  const handlePushToErp = (id: string) => {
    setCashPlans(prev => prev.map(p => p.id === id ? { ...p, status: "已下达" } : p));
    alert("🚀 成功通过 API 下达，已将资金计划推送到集团 ERP 和总账系统进行资金拨备扣减！");
  };

  // Math derivations for Dashboard Charts & Totals
  // Default values before modifications
  const defaultForecastData = [
    { name: "首期到货 (德龙)", originalAmount: 8400000, currentAmount: 8400000, date: "2026-08-20" },
    { name: "力拓矿业到港款", originalAmount: 6800000, currentAmount: 6800000, date: "2026-08-19" },
    { name: "沈阳机床中款", originalAmount: 4500000, currentAmount: 4500000, date: "2026-08-12" },
    { name: "IT设备单（批次1）", originalAmount: 600000, currentAmount: 600000, date: "2026-09-05" },
    { name: "常态其他零星应付", originalAmount: 10400000, currentAmount: 10400000, date: "2026-08-28" }
  ];

  // Recalculate forecasting based on scenario sliders
  const dynamicForecastData = defaultForecastData.map(item => {
    let amount = item.originalAmount;
    let date = item.date;

    // Apply material price fluctuation to Rio Tinto
    if (item.name.includes("力拓")) {
      amount = Math.round(item.originalAmount * materialPriceMultiplier);
    }
    // Apply logistics delay to Steel contract
    if (item.name.includes("德龙") && logisticsDelayDays > 0) {
      // Shift date
      const d = new Date(item.date);
      d.setDate(d.getDate() + logisticsDelayDays);
      date = d.toISOString().split("T")[0];
    }
    // Apply logistics delay to Machinery
    if (item.name.includes("沈阳") && logisticsDelayDays > 5) {
      const d = new Date(item.date);
      d.setDate(d.getDate() + logisticsDelayDays - 5);
      date = d.toISOString().split("T")[0];
    }

    return {
      ...item,
      currentAmount: amount,
      date: date
    };
  });

  const totalMonthlyCashNeeded = dynamicForecastData.reduce((acc, cur) => acc + cur.currentAmount, 0);
  const pendingApprovalsCount = cashPlans.filter(p => p.status === "待审批").length;
  
  // Funding gap detection
  const totalCashReserve = 29000000; // 29 Million cash on hand
  const fundingGap = totalMonthlyCashNeeded - totalCashReserve;

  // ROI Calculator math
  const annualMinsSaved = roiContracts * roiManualTime;
  const annualHoursSaved = Math.round(annualMinsSaved / 60);
  const hourlyRate = (roiSalary * 12) / (250 * 8); // 250 working days, 8 hrs
  const annualSalarySaved = Math.round(annualHoursSaved * hourlyRate);
  
  // Opportunity cost of capital saved by rolling accuracy
  // We assume AI prevents late payment penalties and optimizes cash buffer by 25% of annual purchasing
  const averageContractValue = 800000; // 800k avg
  const annualPurchasingVolume = roiContracts * averageContractValue;
  const capitalBufferOptimized = annualPurchasingVolume * 0.12; // 12% cash occupancy reduced
  const annualInterestSaved = Math.round(capitalBufferOptimized * (roiCapitalHold / 100));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans" id="app-root">
      {/* Dynamic Header */}
      <header className="bg-slate-900 text-white shadow-xl border-b border-slate-800" id="global-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2.5 rounded-lg text-white shadow-md shadow-blue-500/20 flex items-center justify-center">
              <Cpu className="w-6 h-6 animate-pulse-glow" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                资金计划合同自动录入AI系统
                <span className="text-xs bg-emerald-500/20 text-emerald-400 font-medium px-2 py-0.5 rounded border border-emerald-500/30">
                  PM 规划与原型演示版
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">Enterprise Cash Plan & Contract Auto-Entry AI Assistant</p>
            </div>
          </div>

          {/* Nav Links */}
          <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700/60" id="main-nav-toggle">
            <button
              onClick={() => setActiveTab("demo")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                activeTab === "demo"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-300 hover:text-white"
              }`}
              id="nav-tab-demo"
            >
              <LayoutDashboard className="w-4 h-4" />
              💻 AI 智能演示系统
            </button>
            <button
              onClick={() => setActiveTab("blueprint")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                activeTab === "blueprint"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-300 hover:text-white"
              }`}
              id="nav-tab-blueprint"
            >
              <FileText className="w-4 h-4" />
              📘 AI PM 产品白皮书
            </button>
          </div>
        </div>
      </header>

      {/* Top Value Strip */}
      <section className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white py-3.5 border-b border-indigo-900/60" id="live-value-strip">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-4 text-center md:text-left">
          <div className="border-r border-indigo-800/40 last:border-0 pr-2">
            <p className="text-indigo-200 text-[11px] uppercase tracking-wider font-semibold">本月预计资金总需求</p>
            <p className="text-lg font-mono font-bold text-emerald-300 mt-0.5">
              ¥ {(totalMonthlyCashNeeded / 10000).toFixed(1)} 万
            </p>
          </div>
          <div className="border-r border-indigo-800/40 last:border-0 pr-2">
            <p className="text-indigo-200 text-[11px] uppercase tracking-wider font-semibold">待审批资金计划</p>
            <p className="text-lg font-bold text-amber-300 mt-0.5">{pendingApprovalsCount} 项待审</p>
          </div>
          <div className="border-r border-indigo-800/40 last:border-0 pr-2">
            <p className="text-indigo-200 text-[11px] uppercase tracking-wider font-semibold">预测可用头寸冗余</p>
            <p className={`text-lg font-bold mt-0.5 ${fundingGap > 0 ? "text-rose-400" : "text-emerald-400"}`}>
              {fundingGap > 0 ? `缺口 ¥ ${(fundingGap / 10000).toFixed(1)} 万` : "充足 (¥ 2900万覆盖)"}
            </p>
          </div>
          <div className="last:border-0">
            <p className="text-indigo-200 text-[11px] uppercase tracking-wider font-semibold">AI 大模型自动提取率</p>
            <div className="flex items-center gap-1.5 justify-center md:justify-start mt-0.5">
              <span className="text-lg font-bold text-sky-300 font-mono">94.5%</span>
              <span className="text-[10px] bg-sky-500/20 text-sky-300 px-1.5 py-0.2 rounded border border-sky-400/25">极高置信</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Space */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6" id="main-content-canvas">
        
        {/* ========================================================= */}
        {/* TAB 1: AI SMART DEMO SIMULATOR                            */}
        {/* ========================================================= */}
        {activeTab === "demo" && (
          <div className="flex flex-col gap-6" id="demo-mode-container">
            {/* Horizontal Sub-Navigation for Demonstration */}
            <div className="flex border-b border-slate-200 bg-white p-2.5 rounded-xl shadow-sm gap-2" id="demo-sub-nav">
              <button
                onClick={() => setDemoSubTab("dashboard")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  demoSubTab === "dashboard"
                    ? "bg-slate-100 text-blue-600 border border-slate-200"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
                id="sub-tab-dashboard"
              >
                <LayoutDashboard className="w-4 h-4 text-blue-500" />
                1. 首页控制大屏 (Dashboard)
              </button>
              <button
                onClick={() => setDemoSubTab("parser")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  demoSubTab === "parser"
                    ? "bg-slate-100 text-blue-600 border border-slate-200"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
                id="sub-tab-parser"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                2. 合同大模型解析中心
              </button>
              <button
                onClick={() => setDemoSubTab("integration")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  demoSubTab === "integration"
                    ? "bg-slate-100 text-blue-600 border border-slate-200"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
                id="sub-tab-integration"
              >
                <Layers className="w-4 h-4 text-purple-500" />
                3. 业财跨系统对齐校对
              </button>
              <button
                onClick={() => setDemoSubTab("collaboration")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  demoSubTab === "collaboration"
                    ? "bg-slate-100 text-blue-600 border border-slate-200"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
                id="sub-tab-collaboration"
              >
                <Users className="w-4 h-4 text-orange-500" />
                4. 线上审批协同
              </button>
            </div>

            {/* SUBTAB: DASHBOARD */}
            {demoSubTab === "dashboard" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn" id="dashboard-tab-panel">
                {/* Left 2 Columns: Forecasting and Interactive Planning */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                  {/* Monthly Forecasting Custom Chart */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200" id="chart-card">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
                      <div>
                        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-blue-600" />
                          滚动 30 天月度资金付款需求预测 (业财数据融合)
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          基于大模型提取账期，实时关联 ERP/SRM/WMS 进度自动计算并排程。
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg">
                        <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-slate-600 font-medium font-mono">集团实时池头寸: ¥29,000,000</span>
                      </div>
                    </div>

                    {/* Scenario adjustment control deck */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6" id="dashboard-scenario-control">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Calculator className="w-3.5 h-3.5 text-blue-500" />
                          PM 原型仿真模拟器：动态业务变量实时校准资金盘
                        </h4>
                        <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-medium">触发动态滚动预测</span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-slate-600 font-medium">供应链到货延误系数：</span>
                            <span className="font-bold font-mono text-amber-600">{logisticsDelayDays} 天</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="30"
                            value={logisticsDelayDays}
                            onChange={(e) => setLogisticsDelayDays(parseInt(e.target.value))}
                            className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                          />
                          <p className="text-[10px] text-slate-400 mt-1">模拟WMS发运阻滞或物流受挫，AI付款日后移，缓解集团短期存量兑付压力。</p>
                        </div>
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-slate-600 font-medium">不固定价物料结算变动比率 (如铁矿石)：</span>
                            <span className="font-bold font-mono text-indigo-600">{(materialPriceMultiplier * 100).toFixed(0)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0.8"
                            max="1.3"
                            step="0.05"
                            value={materialPriceMultiplier}
                            onChange={(e) => setMaterialPriceMultiplier(parseFloat(e.target.value))}
                            className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                          />
                          <p className="text-[10px] text-slate-400 mt-1">模拟大宗指数波动。不固定价合同款根据普氏价格乘数按秒重估，防止付款溢出。</p>
                        </div>
                      </div>
                    </div>

                    {/* Elegant Custom SVG Visualisation Chart */}
                    <div className="relative h-64 w-full flex items-end gap-3 px-2 pt-6" id="svg-cash-chart">
                      {/* Left axis guide lines */}
                      <div className="absolute left-0 right-0 top-6 border-t border-slate-100 text-[10px] text-slate-400 pt-0.5 pointer-events-none">¥ 10M ---------------------------------------------------------------------------------------------------------</div>
                      <div className="absolute left-0 right-0 top-1/2 border-t border-slate-100 text-[10px] text-slate-400 pt-0.5 pointer-events-none">¥ 5M ---------------------------------------------------------------------------------------------------------</div>
                      
                      {dynamicForecastData.map((bar, i) => {
                        const maxVal = 11000000;
                        const heightPercent = Math.min((bar.currentAmount / maxVal) * 100, 100);
                        const isRioTinto = bar.name.includes("力拓");
                        const isSteel = bar.name.includes("德龙");
                        const isShifted = isSteel && logisticsDelayDays > 0;

                        return (
                          <div key={i} className="flex-1 flex flex-col items-center group relative cursor-pointer z-10">
                            {/* Bar Tooltip */}
                            <div className="absolute bottom-full mb-2 bg-slate-900 text-white text-[11px] px-2.5 py-1.5 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none text-center min-w-[140px] z-20">
                              <p className="font-bold border-b border-slate-700 pb-1 mb-1">{bar.name}</p>
                              <p className="font-mono text-emerald-400">¥ {bar.currentAmount.toLocaleString()}</p>
                              <p className="text-[9px] text-slate-400">排期付款日：{bar.date}</p>
                            </div>

                            {/* Actual Bar Column */}
                            <div
                              style={{ height: `${heightPercent}%` }}
                              className={`w-full rounded-t-lg transition-all duration-500 relative flex items-end justify-center ${
                                isRioTinto 
                                  ? "bg-indigo-500 hover:bg-indigo-600" 
                                  : isSteel 
                                    ? isShifted 
                                      ? "bg-amber-400 hover:bg-amber-500 animate-pulse" 
                                      : "bg-blue-500 hover:bg-blue-600"
                                    : "bg-slate-400 hover:bg-slate-500"
                              }`}
                            >
                              <span className="text-[10px] text-white font-mono font-bold mb-1 hidden sm:inline">
                                {(bar.currentAmount / 10000).toFixed(0)}万
                              </span>
                            </div>

                            {/* Label */}
                            <p className="text-[11px] text-slate-600 font-medium truncate w-full text-center mt-2" title={bar.name}>
                              {bar.name.substring(0,6)}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {bar.date.substring(5)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Cash Plan Table */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200" id="cash-plans-list-card">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
                      <div>
                        <h3 className="font-bold text-slate-800 text-lg">集团付款计划调度表</h3>
                        <p className="text-xs text-slate-500">
                          AI 智能生成。通过关联物流/到货事件，动态调整及校正预计付款日期，防范信用到期与利息沉淀。
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedPreset("fixed_price");
                          setDemoSubTab("parser");
                        }}
                        className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3.5 py-1.8 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-blue-200/50 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> 录入新采购合同
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-slate-700">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-100">
                            <th className="py-3 px-4">关联合同 / 供应商</th>
                            <th className="py-3 px-4">用途节点</th>
                            <th className="py-3 px-4 text-right">拟付款金额</th>
                            <th className="py-3 px-4">预计付款排期</th>
                            <th className="py-3 px-4">审核状态</th>
                            <th className="py-3 px-4 text-center">操作指令</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {cashPlans.map((plan) => (
                            <tr key={plan.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3.5 px-4">
                                <p className="font-bold text-slate-800 text-xs font-mono">{plan.contractNo}</p>
                                <p className="text-xs text-slate-500 truncate max-w-[180px]">{plan.supplier}</p>
                              </td>
                              <td className="py-3.5 px-4 text-xs font-medium text-slate-700">
                                {plan.purpose}
                                {plan.riskReason && (
                                  <span className="block text-[10px] text-amber-600 font-normal mt-0.5 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3 shrink-0" /> {plan.riskReason}
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 text-xs">
                                ¥ {plan.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="text-xs font-mono font-medium text-slate-600 flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                  {plan.plannedDate}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                  plan.status === "已付款" 
                                    ? "bg-slate-100 text-slate-600"
                                    : plan.status === "已下达"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : plan.status === "已审批"
                                        ? "bg-blue-100 text-blue-800"
                                        : "bg-amber-100 text-amber-800"
                                }`}>
                                  {plan.status === "已付款" && <Check className="w-2.5 h-2.5" />}
                                  {plan.status}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                {plan.status === "待审批" && (
                                  <button
                                    onClick={() => handleApprovePlan(plan.id)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-2.5 py-1 rounded shadow-sm"
                                  >
                                    通过审批
                                  </button>
                                )}
                                {plan.status === "已审批" && (
                                  <button
                                    onClick={() => handlePushToErp(plan.id)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-2.5 py-1 rounded shadow-sm flex items-center gap-1 mx-auto"
                                  >
                                    下达ERP
                                  </button>
                                )}
                                {plan.status === "已下达" && (
                                  <span className="text-xs text-emerald-600 font-medium">已记入总账</span>
                                )}
                                {plan.status === "已付款" && (
                                  <span className="text-xs text-slate-400 font-medium">电汇核销完成</span>
                                )}
                                {plan.status === "待提报" && (
                                  <button
                                    onClick={() => {
                                      // Simulating auto-trigger matching
                                      setSelectedPreset("framework");
                                      setDemoSubTab("parser");
                                    }}
                                    className="text-indigo-600 hover:text-indigo-800 font-semibold text-xs border border-indigo-200 hover:border-indigo-300 bg-indigo-50/30 px-2 py-0.5 rounded"
                                  >
                                    开始匹配核销
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Right 1 Column: Warning Cards and KPI items */}
                <div className="flex flex-col gap-6" id="dashboard-right-rail">
                  {/* Risk Alert Panel */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200" id="warnings-card">
                    <h3 className="font-bold text-slate-800 text-md flex items-center gap-1.5 border-b border-slate-100 pb-3 mb-4">
                      <AlertTriangle className="w-5 h-5 text-amber-500 animate-bounce" />
                      高风险付款事项 & 预警提示
                    </h3>

                    <div className="flex flex-col gap-4">
                      {/* Gap Alarm */}
                      {fundingGap > 0 ? (
                        <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-xl">
                          <div className="flex items-start gap-2.5">
                            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-bold text-rose-900">🚨 资金流安全警报：存量头寸不足</p>
                              <p className="text-[11px] text-rose-700 mt-1">
                                本期计划总付款需求为 <b>¥ {(totalMonthlyCashNeeded/10000).toFixed(0)} 万</b>，而本月可用流动资金池仅为 <b>¥ 2900 万</b>。当前产生 <b>¥ {(fundingGap/10000).toFixed(1)} 万</b> 临时性资金缺口。
                              </p>
                              <p className="text-[10px] text-slate-500 mt-2 italic">
                                *AI建议：将江苏德龙首批到货款支付期合理滚动后延 5 天，或在8月15日前安排300万短期拆借。
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-xl">
                          <div className="flex items-start gap-2.5">
                            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-bold text-emerald-900">✅ 资金安全边际：充足</p>
                              <p className="text-[11px] text-emerald-700 mt-1">
                                流动头寸（¥ 2900 万）可完全覆盖本月资金支出。请合理微调排期实现资金收益最大化。
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Item Warning 1 */}
                      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl">
                        <p className="text-xs font-bold text-amber-900 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> 力拓矿业指数浮动计价风险
                        </p>
                        <p className="text-[11px] text-amber-800 mt-1.5">
                          由于普氏指数本周处于高位。若直接执行到期结算，由于汇率及单价上涨，结算尾款金额预计将比原本暂估<b>高出 15.0 万 RMB (+1.76%)</b>。
                        </p>
                        <div className="mt-2.5 flex items-center gap-2">
                          <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-bold">建议</span>
                          <span className="text-[10px] text-slate-600">按暂估预留 8.5M，尾款在8月15日指数重新核算后对齐。</span>
                        </div>
                      </div>

                      {/* Item Warning 2 */}
                      <div className="bg-sky-50 border-l-4 border-sky-500 p-4 rounded-r-xl">
                        <p className="text-xs font-bold text-sky-900 flex items-center gap-1">
                          <Truck className="w-3.5 h-3.5 text-sky-600" /> 江阴钢材在途物流正常但ETA偏晚
                        </p>
                        <p className="text-[11px] text-sky-800 mt-1.5">
                          中远海运物流系统反馈：受港口封航影响，预计到港时间为 8月20日。合同条款约定“到货验收后10个工作日付到货款”。
                        </p>
                        <p className="text-[10px] text-slate-600 mt-2">
                          <b>AI联动机制：</b>已向采购总监发起提议，建议将原本 8月20日 拟付款日推迟到 <b>8月25日</b>。可直接降低本月15日至20日的集中兑付头寸压力。
                        </p>
                        <div className="mt-3 flex justify-end">
                          <button
                            onClick={() => {
                              setSelectedPreset("fixed_price");
                              setDemoSubTab("parser");
                            }}
                            className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-[10px] px-2.5 py-1 rounded"
                          >
                            前往对齐物流
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* System Architecture Micro-View */}
                  <div className="bg-slate-900 text-slate-100 p-6 rounded-2xl shadow-sm border border-slate-800">
                    <h3 className="font-bold text-md border-b border-slate-800 pb-3 mb-4 flex items-center gap-2 text-sky-400">
                      <Workflow className="w-5 h-5" />
                      业财多源系统连接状态
                    </h3>
                    
                    <div className="flex flex-col gap-3 text-xs">
                      <div className="flex items-center justify-between p-2 rounded bg-slate-800/50">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                          <span className="font-medium">SRM 采购管理系统</span>
                        </div>
                        <span className="font-mono text-[10px] text-slate-400">已连接 (PO、价格)</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded bg-slate-800/50">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                          <span className="font-medium">WMS 智能仓储系统</span>
                        </div>
                        <span className="font-mono text-[10px] text-slate-400">已连接 (收货件数)</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded bg-slate-800/50">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                          <span className="font-medium">海/陆运实时物流系统</span>
                        </div>
                        <span className="font-mono text-[10px] text-slate-400">已连接 (ETA轨迹)</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded bg-slate-800/50">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                          <span className="font-medium">ERP 财务总账系统</span>
                        </div>
                        <span className="font-mono text-[10px] text-slate-400">已连接 (应付挂账)</span>
                      </div>
                    </div>
                    
                    <div className="bg-slate-800 p-3 rounded-lg border border-slate-700/50 mt-4 text-[11px] text-slate-300">
                      <p className="font-semibold text-sky-300 mb-1">AI 深度学习判断逻辑：</p>
                      如果 WMS 尚未完成对某一 PO 的收货，且物流定位离目的地超过 100 海里，即使合同规定付款日将至，AI 也会根据海运时速智能推荐推迟付款计划，确保财务主动掌控资金。
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SUBTAB: CONTRACT PARSER STUDIO */}
            {demoSubTab === "parser" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn" id="parser-tab-panel">
                
                {/* Left 4 Columns: Preset Selectors & Paste box */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-800 text-md mb-3 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      1. 选择合同样本或上传文件
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">
                      支持PDF、Word等非结构化采购合同，支持定量、浮动价及框架性采购协议。
                    </p>

                    <div className="flex flex-col gap-2.5 mb-4" id="contract-presets-container">
                      <button
                        onClick={() => handlePresetSelect("fixed_price")}
                        className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${
                          selectedPreset === "fixed_price"
                            ? "bg-blue-50 border-blue-500 text-blue-900 font-bold"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        📊 定量定价：钢材采购年度协议
                        <span className="block text-[10px] text-slate-400 font-normal mt-1">固定单价、三批滚动付款账期清晰</span>
                      </button>

                      <button
                        onClick={() => handlePresetSelect("variable_price")}
                        className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${
                          selectedPreset === "variable_price"
                            ? "bg-blue-50 border-blue-500 text-blue-900 font-bold"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        🌊 定量不定价：铁矿石现货供应合同
                        <span className="block text-[10px] text-slate-400 font-normal mt-1">采用普氏指数浮动，信用账期结算</span>
                      </button>

                      <button
                        onClick={() => handlePresetSelect("framework")}
                        className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${
                          selectedPreset === "framework"
                            ? "bg-blue-50 border-blue-500 text-blue-900 font-bold"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        📦 框架协议：IT终端硬件采购框架
                        <span className="block text-[10px] text-slate-400 font-normal mt-1">无具体总额，绑定SRM下发单据月结45天</span>
                      </button>

                      <button
                        onClick={() => handlePresetSelect("custom")}
                        className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${
                          selectedPreset === "custom"
                            ? "bg-blue-50 border-blue-500 text-blue-900 font-bold"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        ✍️ 自定义上传 / 粘贴合同样本
                        <span className="block text-[10px] text-slate-400 font-normal mt-1">贴入您准备好的真实草案进行AI现场解析</span>
                      </button>
                    </div>

                    {/* Drag and Drop/Text Area Area */}
                    <div className="flex flex-col gap-3">
                      {/* Interactive Drag & Drop Box */}
                      <div
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-xl p-4 text-center transition-all duration-200 relative overflow-hidden ${
                          dragActive 
                            ? "border-blue-500 bg-blue-50/50 scale-[1.01] shadow-lg shadow-blue-500/10" 
                            : "border-slate-200 bg-slate-50 hover:bg-slate-50/80"
                        }`}
                      >
                        {isOcrScanning && (
                          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px] flex flex-col items-center justify-center z-20">
                            {/* Scanning Laser Line */}
                            <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_10px_#60a5fa] animate-scan-laser top-0"></div>
                            <div className="bg-slate-950/90 text-blue-400 font-mono text-[9px] px-3 py-1.5 rounded-lg border border-blue-500/30 flex flex-col items-center gap-1">
                              <span className="flex items-center gap-1.5">
                                <RefreshCw className="w-3 h-3 animate-spin text-blue-400" />
                                [OCR 激光视觉芯片对齐中...]
                              </span>
                              <span className="text-[8px] text-slate-500">MATRIX: X_COORD={Math.floor(Math.random() * 800)} Y_COORD={Math.floor(Math.random() * 605)}</span>
                            </div>
                          </div>
                        )}

                        <input
                          type="file"
                          id="contract-file-upload"
                          className="hidden"
                          multiple
                          accept=".docx,.xlsx,.xls,.png,.jpg,.jpeg,.txt"
                          onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              handleMultiFileUpload(e.target.files);
                            }
                          }}
                        />

                        {uploadedFiles.length > 0 ? (
                          <div className="flex flex-col gap-3 text-left w-full">
                            {/* Header or Quick Stats of Multi-Files */}
                            <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-100 p-2 rounded-lg">
                              <span>已上传 {uploadedFiles.length} 个文件</span>
                              <button 
                                onClick={(e) => {
                                  e.preventDefault();
                                  setUploadedFiles([]);
                                  setCustomContractText("");
                                }}
                                className="text-red-500 hover:text-red-700 font-bold transition-colors cursor-pointer"
                              >
                                清空全部
                              </button>
                            </div>

                            {/* Scrollable list of files with their individual status, filters and classifiers */}
                            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                              {uploadedFiles.map((file) => {
                                const isScanning = file.isOcrScanning || file.status === "decoding" || file.status === "classifying";
                                return (
                                  <div 
                                    key={file.id}
                                    className={`p-3 rounded-xl border transition-all duration-200 relative ${
                                      !file.isContract 
                                        ? "bg-rose-50/70 border-rose-100 text-rose-900" 
                                        : file.status === "completed" 
                                          ? "bg-white border-slate-200 hover:border-slate-300 shadow-sm" 
                                          : "bg-slate-50 border-slate-150"
                                    }`}
                                  >
                                    {/* Scan laser overlay if analyzing */}
                                    {isScanning && (
                                      <div className="absolute inset-0 bg-blue-50/20 rounded-xl overflow-hidden pointer-events-none">
                                        <div className="absolute left-0 right-0 h-0.5 bg-blue-400 opacity-60 shadow-[0_0_8px_#3b82f6] animate-scan-laser top-0"></div>
                                      </div>
                                    )}

                                    {/* Line 1: File Info and Action Buttons */}
                                    <div className="flex items-start gap-2.5">
                                      <div className="p-1.5 bg-slate-100 rounded text-slate-600 mt-0.5 flex-shrink-0">
                                        {file.name.endsWith(".docx") ? (
                                          <FileText className="w-4 h-4 text-indigo-500" />
                                        ) : file.name.match(/\.(xlsx|xls)$/) ? (
                                          <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                                        ) : file.isImage ? (
                                          <Paperclip className="w-4 h-4 text-rose-500" />
                                        ) : (
                                          <FileText className="w-4 h-4 text-slate-500" />
                                        )}
                                      </div>

                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-slate-800 truncate" title={file.name}>
                                          {file.name}
                                        </p>
                                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                          {(file.size / 1024).toFixed(1)} KB | {file.type || "未知格式"}
                                        </p>
                                      </div>

                                      {/* Buttons on the right */}
                                      <div className="flex items-center gap-1 flex-shrink-0">
                                        {file.isImage && file.base64 && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              setFileBase64(file.base64 || "");
                                              setShowBase64Modal(true);
                                            }}
                                            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                                            title="查看 Base64"
                                          >
                                            <Eye className="w-3.5 h-3.5 text-sky-500" />
                                          </button>
                                        )}
                                        <button
                                          onClick={(e) => {
                                            e.preventDefault();
                                            setUploadedFiles(prev => prev.filter(f => f.id !== file.id));
                                          }}
                                          className="text-slate-400 hover:text-red-500 p-1 rounded-full hover:bg-slate-100 transition-colors"
                                          title="移除"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Line 2: Pipeline State and Badges */}
                                    <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 justify-between">
                                      {/* Left: Pipeline Status Badge */}
                                      <div className="flex items-center gap-1">
                                        {file.status === "idle" && (
                                          <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">排队中</span>
                                        )}
                                        {file.status === "decoding" && (
                                          <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                                            <RefreshCw className="w-2.5 h-2.5 animate-spin" /> 二进制解码...
                                          </span>
                                        )}
                                        {file.status === "classifying" && (
                                          <span className="text-[9px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                                            <RefreshCw className="w-2.5 h-2.5 animate-spin" /> 版面分类扫描...
                                          </span>
                                        )}
                                        {file.status === "completed" && file.isContract && (
                                          <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-semibold flex items-center gap-0.5">
                                            <CheckCircle className="w-2.5 h-2.5" /> OCR & 分类已就绪
                                          </span>
                                        )}
                                        {file.status === "completed" && !file.isContract && (
                                          <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                                            <AlertTriangle className="w-2.5 h-2.5" /> 已拦截 (非合同)
                                          </span>
                                        )}
                                        {file.status === "error" && (
                                          <span className="text-[9px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-medium">处理失败</span>
                                        )}
                                      </div>

                                      {/* Right: Classifier and Importance Badges */}
                                      {file.status === "completed" && (
                                        <div className="flex items-center gap-1">
                                          {/* Filter Indicator */}
                                          {file.isContract ? (
                                            <span className="text-[9px] bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded font-semibold border border-sky-100">
                                              合同要素 ✅
                                            </span>
                                          ) : (
                                            <span className="text-[9px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded font-bold border border-red-100">
                                              拦截屏蔽 ❌
                                            </span>
                                          )}

                                          {/* Page/Document Classification */}
                                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                                            file.classification === "payment_terms" 
                                              ? "bg-purple-100 text-purple-700 font-bold" 
                                              : file.classification === "signatures" 
                                                ? "bg-teal-100 text-teal-700 font-bold" 
                                                : file.classification === "non_contract" 
                                                  ? "bg-slate-200 text-slate-700" 
                                                  : "bg-slate-100 text-slate-600"
                                          }`}>
                                            分类：{translateClassification(file.classification)}
                                          </span>

                                          {/* Importance Tag */}
                                          {file.importance === "high" && (
                                            <span className="text-[9px] bg-rose-600 text-white px-1.5 py-0.5 rounded font-bold animate-pulse">
                                              ★ 核心主板 (着重分析)
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    {/* Rejection / Actionable Feedback */}
                                    {file.status === "completed" && file.rejectionReason && (
                                      <p className="text-[9px] text-slate-500 bg-slate-100/80 p-2 rounded-lg mt-2 leading-normal border-l-2 border-red-400">
                                        <b>安全提示：</b>{file.rejectionReason}
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            <p className="text-[10px] text-slate-400 font-normal italic leading-relaxed text-center mt-1">
                              💡 体验技巧：您可以继续拖入或上传更多页面！系统会自动提取多张图，过滤非合同杂质并分类打包，为您呈现合并解析。
                            </p>
                          </div>
                        ) : (
                          <label htmlFor="contract-file-upload" className="cursor-pointer block">
                            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2 stroke-1 animate-pulse" />
                            <p className="text-xs text-slate-700 font-semibold">拖拽多张图片/文件，或点击批量上传</p>
                            <p className="text-[10px] text-slate-400 mt-1 max-w-[240px] mx-auto">
                              支持 Word (.docx)、Excel (.xlsx/.xls)、图片 (.png/.jpg) 及纯文本 (.txt)
                            </p>
                            <span className="inline-block text-[9px] bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2.5 py-0.5 mt-2 font-medium">
                              已支持多图流合并、高保真OCR与安全智能拦截过滤器
                            </span>
                          </label>
                        )}
                      </div>

                      {/* Display textarea/preset button panel when on custom preset */}
                      {selectedPreset === "custom" ? (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">提取到的文本内容及微调：</label>
                            {uploadedFiles.length > 0 && (
                              <span className="text-[9px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-medium">
                                来自 多图流合并编译器 ({uploadedFiles.filter(f => f.isContract && f.status === "completed").length} 页生效)
                              </span>
                            )}
                          </div>
                          <textarea
                            value={customContractText}
                            onChange={(e) => setCustomContractText(e.target.value)}
                            placeholder="请在这里粘贴非结构化文本合同，或直接在上方拖入文件解析..."
                            rows={6}
                            className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          />
                          <button
                            onClick={() => handleTriggerParse(customContractText, "custom")}
                            disabled={parsingLoading || !customContractText.trim()}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 rounded-xl shadow mt-2 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {parsingLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                            运行智能 AI 合同解析
                          </button>
                        </div>
                      ) : (
                        <div className="bg-blue-50/50 rounded-xl p-3 border border-blue-100 text-center">
                          <p className="text-[10px] text-slate-500 leading-normal">
                            当前选用了<b>演示样本合同</b>，您可直接触发 AI 识别该样本。或者点击上方的<b>“✍️ 自定义上传/粘贴合同样本”</b>来上传自己的真实文件！
                          </p>
                          <button
                            onClick={() => {
                              const text = contractPresets[selectedPreset as "fixed_price" | "variable_price" | "framework"];
                              handleTriggerParse(text, selectedPreset);
                            }}
                            disabled={parsingLoading}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl mt-3 transition-colors w-full shadow-md shadow-blue-500/10 flex items-center justify-center gap-2"
                          >
                            {parsingLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                            直接运行演示样本智能识别（Gemini）
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Processing Logs Console */}
                  {parsingLogs.length > 0 && (
                    <div className="bg-slate-950 text-slate-100 p-4 rounded-2xl shadow-inner border border-slate-800 font-mono text-[10px] flex flex-col gap-1.5 h-48 overflow-y-auto">
                      <p className="text-slate-500 border-b border-slate-900 pb-1 mb-1 font-sans flex items-center justify-between">
                        <span>大模型解析流式日志</span>
                        {parsingLoading && <RefreshCw className="w-3 h-3 animate-spin text-blue-400" />}
                      </p>
                      {parsingLogs.map((log, index) => (
                        <p key={index} className="text-slate-300">
                          {log}
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right 8 Columns: Dynamic Output & Interactive Fields */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                  {/* Sise-By-Side Visualizer */}
                  {isParsingSuccess && parsedResult ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                      <div className="bg-slate-900 px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse-glow"></span>
                          <span className="text-sm font-bold text-slate-100">AI 合同智能解析面板 - 解析成功</span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          解析调用：<b>{parserSource === "custom-llm" ? `小米Mimo大模型 (${parserModel})` : parserSource === "simulator" ? "本地模拟引擎" : `Gemini 3.5 Flash`}</b>
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-150">
                        {/* Left split: Contract Raw Text Highlighted */}
                        <div className="p-5 bg-slate-50/50">
                          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1">
                            <FileText className="w-4 h-4 text-slate-500" />
                            原始合同文本配准视图
                          </h4>
                          <div className="bg-white p-4 rounded-xl border border-slate-200 text-[11px] font-sans leading-relaxed text-slate-600 max-h-[480px] overflow-y-auto shadow-inner select-text">
                            {selectedPreset !== "custom" ? (
                              <div className="whitespace-pre-wrap">
                                {selectedPreset === "fixed_price" && (
                                  <>
                                    <span className="bg-yellow-100 text-yellow-900 p-0.5 rounded font-bold font-mono">合同编号：HT-2026-STEEL-089</span><br />
                                    甲方：上海宝聚重工集团有限公司<br />
                                    <span className="bg-emerald-100 text-emerald-900 p-0.5 rounded font-bold">乙方：江苏德龙镍业有限公司</span><br />
                                    一、交易标的及金额<br />
                                    本合同约定采购国标热轧卷板，总量 5000 吨，单价 4200 元/吨（含税），<span className="bg-purple-100 text-purple-900 p-0.5 rounded font-bold font-mono">合同总金额为人民币 21,000,000.00 元</span>（大写：贰仟壹佰万元整）。<br />
                                    二、交货时间与物料安排<br />
                                    乙方需在 <span className="bg-sky-100 text-sky-900 p-0.5 rounded font-mono font-bold">2026 年 8 月 15 日前完成首批 2500 吨提货</span>，并于 <span className="bg-sky-100 text-sky-900 p-0.5 rounded font-mono font-bold">2026 年 8 月 20 日前通过海运方式运抵WMS 2号仓库</span>。<br />
                                    三、付款方式及节点<br />
                                    1. <span className="bg-blue-50 text-blue-900 p-0.5 rounded border border-blue-100">预付款：甲方支付合同总金额的 30% 作为预付款，即人民币 6,300,000.00 元</span>。<br />
                                    2. <span className="bg-blue-50 text-blue-900 p-0.5 rounded border border-blue-100">到货款：首批物资到货验收合格后 10 个工作日内，凭发票及收货确认书支付合同总金额的 40%</span>。<br />
                                    3. <span className="bg-blue-50 text-blue-900 p-0.5 rounded border border-blue-100">尾款：全部物资到货且质保期满 30 天后支付剩余 30% 尾款</span>。<br />
                                  </>
                                )}
                                {selectedPreset === "variable_price" && (
                                  <>
                                    <span className="bg-yellow-100 text-yellow-900 p-0.5 rounded font-bold font-mono">合同编号：HT-2026-ORE-102</span><br />
                                    甲方：山东钢铁集团有限公司<br />
                                    <span className="bg-emerald-100 text-emerald-900 p-0.5 rounded font-bold">乙方：力拓矿业（中国）有限公司</span><br />
                                    一、交易内容<br />
                                    甲方从乙方采购高品位铁矿石 10,000 吨。单价采用“暂估价格+后期结算”模式。<span className="bg-purple-100 text-purple-900 p-0.5 rounded font-bold font-mono">暂估单价为 850 元/吨（预计总价为 8,500,000.00 元）</span>。最终价格以普氏铁矿石指数均价为准。<br />
                                    二、信用账期与到货<br />
                                    乙方于 <span className="bg-sky-100 text-sky-900 p-0.5 rounded font-mono">2026 年 8 月 5 日将货物运抵青岛港</span>。甲方在货物到港并取得第三方检验报告后，<span className="bg-sky-100 text-sky-900 p-0.5 rounded font-mono font-bold">给予乙方 15 天信用账期（预计付款窗口为 2026 年 8 月 20 日左右）</span>。<br />
                                  </>
                                )}
                                {selectedPreset === "framework" && (
                                  <>
                                    <span className="bg-yellow-100 text-yellow-900 p-0.5 rounded font-bold font-mono">合同编号：HT-2026-IT-FRAME</span><br />
                                    甲方：平安科技（深圳）有限公司<br />
                                    <span className="bg-emerald-100 text-emerald-900 p-0.5 rounded font-bold">乙方：联想（北京）有限公司</span><br />
                                    一、合同性质<br />
                                    本合同为 <span className="bg-purple-100 text-purple-900 p-0.5 rounded">2026 年度 IT 设备及终端采购框架协议</span>。不约定具体交易总量。具体采购内容、单价、交货期以甲方通过 SRM 系统下发的《采购订单（PO）》为准。<br />
                                    二、付款条件（标准账期）<br />
                                    所有采购订单，<span className="bg-blue-50 text-blue-900 p-0.5 rounded border border-blue-100 font-bold">均执行“月度结账，账期 45 天（M+45）”的付款条件</span>。
                                  </>
                                )}
                              </div>
                            ) : (
                              <div className="whitespace-pre-wrap">{customContractText}</div>
                            )}
                          </div>
                          <div className="mt-3 flex items-center gap-1.5 text-[10px] text-slate-500">
                            <span className="inline-block w-2.5 h-2.5 bg-yellow-100 border border-yellow-300 rounded-sm"></span> 编号
                            <span className="inline-block w-2.5 h-2.5 bg-emerald-100 border border-emerald-300 rounded-sm"></span> 供应商
                            <span className="inline-block w-2.5 h-2.5 bg-purple-100 border border-purple-300 rounded-sm"></span> 金额
                            <span className="inline-block w-2.5 h-2.5 bg-sky-100 border border-sky-300 rounded-sm"></span> 账期节点
                          </div>
                        </div>

                        {/* Right split: Structured Fields & Human Modifiers */}
                        <div className="p-5 flex flex-col gap-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                              <Cpu className="w-4 h-4 text-emerald-600" />
                              AI 提取结构化数据 (可点击修改)
                            </h4>
                            <span className="text-[10px] text-slate-400">双击单格直接校核微调</span>
                          </div>

                          <div className="grid grid-cols-1 gap-3 text-xs">
                            {/* Contract No */}
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 relative group">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-slate-500 font-medium text-[10px]">合同编号 (Contract No)</span>
                                <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded font-bold">98% 置信</span>
                              </div>
                              {isEditing === "contractNumber" ? (
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    defaultValue={editedFields.contractNumber}
                                    onBlur={(e) => handleSaveField("contractNumber", e.target.value)}
                                    className="p-1 border border-blue-400 rounded focus:outline-none w-full font-mono bg-white text-xs"
                                    autoFocus
                                  />
                                </div>
                              ) : (
                                <p
                                  onDoubleClick={() => setIsEditing("contractNumber")}
                                  className="font-mono font-bold text-slate-800 flex items-center gap-1 cursor-pointer"
                                >
                                  {parsedResult.contractNumber}
                                  <Edit2 className="w-3 h-3 text-slate-300 group-hover:text-slate-500 transition-colors ml-auto" />
                                </p>
                              )}
                            </div>

                            {/* Supplier */}
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 relative group">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-slate-500 font-medium text-[10px]">供应商名称 (Supplier)</span>
                                <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded font-bold">99% 置信</span>
                              </div>
                              {isEditing === "supplierName" ? (
                                <input
                                  type="text"
                                  defaultValue={editedFields.supplierName}
                                  onBlur={(e) => handleSaveField("supplierName", e.target.value)}
                                  className="p-1 border border-blue-400 rounded focus:outline-none w-full bg-white text-xs"
                                  autoFocus
                                />
                              ) : (
                                <p
                                  onDoubleClick={() => setIsEditing("supplierName")}
                                  className="font-semibold text-slate-800 flex items-center gap-1 cursor-pointer"
                                >
                                  {parsedResult.supplierName}
                                  <Edit2 className="w-3 h-3 text-slate-300 group-hover:text-slate-500 transition-colors ml-auto" />
                                </p>
                              )}
                            </div>

                            {/* Total Amount */}
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 relative group">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-slate-500 font-medium text-[10px]">合同金额 (Amount)</span>
                                <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded font-bold">95% 置信</span>
                              </div>
                              {isEditing === "contractAmount" ? (
                                <input
                                  type="number"
                                  defaultValue={editedFields.contractAmount}
                                  onBlur={(e) => handleSaveField("contractAmount", parseFloat(e.target.value))}
                                  className="p-1 border border-blue-400 rounded focus:outline-none w-full bg-white text-xs font-mono"
                                  autoFocus
                                />
                              ) : (
                                <p
                                  onDoubleClick={() => setIsEditing("contractAmount")}
                                  className="font-bold font-mono text-slate-950 text-sm flex items-center gap-1 cursor-pointer"
                                >
                                  ¥ {parsedResult.contractAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  <Edit2 className="w-3 h-3 text-slate-300 group-hover:text-slate-500 transition-colors ml-auto" />
                                </p>
                              )}
                            </div>

                            {/* Payment terms */}
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <span className="text-slate-500 font-medium text-[10px] block mb-1">付款节点与触发规则 (Payment Nodes Split)</span>
                              <div className="flex flex-col gap-2">
                                {parsedResult.paymentNodes.map((node, nIdx) => (
                                  <div key={nIdx} className="bg-white p-2 rounded-lg border border-slate-100 text-[11px] flex justify-between items-start gap-2">
                                    <div>
                                      <p className="font-bold text-slate-800">{node.nodeName} ({node.percentage}%)</p>
                                      <p className="text-[10px] text-slate-400 mt-0.5">{node.triggerCondition}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="font-bold font-mono text-slate-900">¥ {node.amount.toLocaleString()}</p>
                                      <p className="text-[9px] text-slate-400 font-mono">账期: {node.estimatedDaysAfterTrigger}天</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Estimated Dates */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <span className="text-slate-500 font-medium text-[10px] block mb-0.5">预计提货日期</span>
                                <span className="font-mono font-bold text-slate-700">{parsedResult.expectedPickupDate || "待定"}</span>
                              </div>
                              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <span className="text-slate-500 font-medium text-[10px] block mb-0.5">预计到货日期</span>
                                <span className="font-mono font-bold text-slate-700">{parsedResult.expectedDeliveryDate || "待定"}</span>
                              </div>
                            </div>

                            {/* Main CTA */}
                            <div className="mt-2 flex flex-col sm:flex-row gap-3">
                              <button
                                onClick={handleTriggerSystemMatch}
                                disabled={systemMatchLoading}
                                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-2.5 rounded-xl shadow shadow-blue-500/10 flex items-center justify-center gap-2 transition-all"
                              >
                                {systemMatchLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                                第一步：开始跨系统核验并对齐
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
                      <FileSpreadsheet className="w-16 h-16 text-slate-300 mb-4 stroke-1" />
                      <h4 className="font-bold text-slate-800 text-lg">大模型解析中心就绪</h4>
                      <p className="text-slate-500 text-sm max-w-md mt-2">
                        请在左侧点击一个合同样本或粘贴您的草案文本，系统将通过 Gemini-3.5-flash 大模型流式解析关键应付账款和付款节点。
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SUBTAB: SYSTEM INTEGRATION */}
            {demoSubTab === "integration" && (
              <div className="flex flex-col gap-6 animate-fadeIn" id="integration-tab-panel">
                {/* Visual Pipeline Block */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <div className="border-b border-slate-100 pb-4 mb-6">
                    <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                      <Layers className="w-5 h-5 text-indigo-500" />
                      跨系统关联：业财融合底层数据流
                    </h3>
                    <p className="text-xs text-slate-500">
                      AI 智能体直接穿透 ERP 账单、SRM 采购订单、WMS 进仓记录、海上/陆路在途物流系统，完成物理状态对齐。
                    </p>
                  </div>

                  {hasAligned && alignedSystems ? (
                    <div className="flex flex-col gap-6">
                      {/* Diagram */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
                        {/* SRM Card */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 relative">
                          <div className="flex items-center gap-2 text-indigo-600 mb-2 font-bold text-xs uppercase tracking-wider">
                            <Search className="w-4 h-4" /> SRM (采购系统)
                          </div>
                          <div className="text-xs font-mono space-y-1 text-slate-600">
                            <p>采购订单：{alignedSystems.srm.poNumber}</p>
                            <p>订单金额：¥ {alignedSystems.srm.poAmount.toLocaleString()}</p>
                            <p>物料规格：{parsedResult?.productInfo}</p>
                            <p>状态：<span className="text-emerald-600 font-semibold">{alignedSystems.srm.orderStatus}</span></p>
                          </div>
                          <div className="absolute top-1/2 -right-3 -translate-y-1/2 bg-white border border-slate-200 rounded-full p-0.5 z-10 hidden md:block">
                            <ArrowRight className="w-4 h-4 text-slate-400" />
                          </div>
                        </div>

                        {/* Logistics Card */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 relative">
                          <div className="flex items-center gap-2 text-blue-600 mb-2 font-bold text-xs uppercase tracking-wider">
                            <Truck className="w-4 h-4" /> 物流监控系统
                          </div>
                          <div className="text-xs font-mono space-y-1 text-slate-600">
                            <p>承运商：{alignedSystems.logistics.carrier}</p>
                            <p>物流轨迹：{alignedSystems.logistics.shipmentStatus}</p>
                            <p>定位：{alignedSystems.logistics.currentLocation}</p>
                            <p>最新到港ETA：<span className="text-blue-600 font-semibold">{alignedSystems.logistics.estimatedArrival}</span></p>
                          </div>
                          <div className="absolute top-1/2 -right-3 -translate-y-1/2 bg-white border border-slate-200 rounded-full p-0.5 z-10 hidden md:block">
                            <ArrowRight className="w-4 h-4 text-slate-400" />
                          </div>
                        </div>

                        {/* WMS Card */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 relative">
                          <div className="flex items-center gap-2 text-amber-600 mb-2 font-bold text-xs uppercase tracking-wider">
                            <Database className="w-4 h-4" /> WMS (仓储管理)
                          </div>
                          <div className="text-xs font-mono space-y-1 text-slate-600">
                            <p>收货仓库：{alignedSystems.wms.warehouseId}</p>
                            <p>实收件数：{alignedSystems.wms.receivedQty} Pcs</p>
                            <p>入库状态：<span className="text-amber-600 font-semibold">{alignedSystems.wms.receivedStatus}</span></p>
                          </div>
                          <div className="absolute top-1/2 -right-3 -translate-y-1/2 bg-white border border-slate-200 rounded-full p-0.5 z-10 hidden md:block">
                            <ArrowRight className="w-4 h-4 text-slate-400" />
                          </div>
                        </div>

                        {/* ERP Card */}
                        <div className="bg-slate-900 text-slate-100 p-4 rounded-xl relative">
                          <div className="flex items-center gap-2 text-sky-400 mb-2 font-bold text-xs uppercase tracking-wider">
                            <Coins className="w-4 h-4" /> ERP (财务挂账)
                          </div>
                          <div className="text-xs font-mono space-y-1 text-slate-300">
                            <p>已核销预付：¥ {alignedSystems.erp.paidAmount.toLocaleString()}</p>
                            <p>待处理应付：¥ {alignedSystems.erp.unpaidAccountsPayable.toLocaleString()}</p>
                            {alignedSystems.erp.advancePaymentDate && (
                              <p>预付账期时间：{alignedSystems.erp.advancePaymentDate}</p>
                            )}
                            <p>校验结果：<span className="text-emerald-400 font-semibold">AI核验完毕</span></p>
                          </div>
                        </div>
                      </div>

                      {/* Discrepancies results */}
                      <div className="mt-4" id="discrepancy-log-deck">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                          🔬 业财多源核实与预警解析
                        </h4>
                        
                        <div className="flex flex-col gap-3">
                          {discrepancies.map((disc, idx) => (
                            <div key={idx} className={`p-4 rounded-xl border ${
                              disc.severity === "success" 
                                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                                : disc.severity === "warning"
                                  ? "bg-amber-50 border-amber-200 text-amber-900"
                                  : "bg-sky-50 border-sky-200 text-sky-900"
                            }`}>
                              <div className="flex items-start gap-3">
                                <Info className="w-5 h-5 mt-0.5 shrink-0" />
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-xs">{disc.field}</span>
                                    <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 uppercase font-semibold">
                                      {disc.system}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4 text-[11px] text-slate-600 font-mono my-2 bg-white/60 p-2 rounded border border-slate-100">
                                    <p><b>📜 合同要求条款：</b> {disc.contractValue}</p>
                                    <p><b>🏭 物流/实物进度：</b> {disc.systemValue}</p>
                                  </div>
                                  <p className="text-xs text-slate-700 leading-relaxed">{disc.description}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Calibrate Trigger CTA */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 mt-2">
                        <div>
                          <p className="text-xs font-bold text-slate-800">✨ 第二步：根据 WMS/物流最新进度智能对齐付款</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">一键触发自动测算付款期。系统将修改排期写入现金流大屏，保障无感财务控制。</p>
                        </div>
                        <button
                          onClick={handleCalibrateAndAdjustPlans}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow shadow-blue-500/20 whitespace-nowrap transition-colors"
                        >
                          一键执行 AI 自动校准
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 flex flex-col items-center justify-center">
                      <Layers className="w-16 h-16 text-slate-300 mb-4 stroke-1" />
                      <p className="text-slate-500 text-sm">暂无待匹配项。请先在 [2. 合同大模型解析中心] 触发大模型提取。</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SUBTAB: COLLABORATIVE APPROVALS */}
            {demoSubTab === "collaboration" && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-fadeIn" id="collaboration-tab-panel">
                <div className="border-b border-slate-100 pb-4 mb-6">
                  <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                    <Users className="w-5 h-5 text-orange-500" />
                    协同审批：总部与业务单元一站式协同
                  </h3>
                  <p className="text-xs text-slate-500">
                    彻底告别繁琐的线下 Excel 表格流转、汇总缺失以及版本混乱等痼疾。实现逐级审核与 API 写入挂账。
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Left 7 columns: Workflow Feed */}
                  <div className="md:col-span-8 flex flex-col gap-4">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      审批链与操作记录
                    </h4>

                    <div className="flex flex-col gap-3">
                      {cashPlans.map((plan) => (
                        <div key={plan.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-800 font-mono">{plan.contractNo}</span>
                              <span className="text-[10px] text-slate-400">|</span>
                              <span className="text-[11px] text-slate-600 font-medium">{plan.supplier}</span>
                            </div>
                            <p className="text-xs text-slate-800 mt-1">{plan.purpose}</p>
                            <p className="text-[10px] font-mono text-slate-500 mt-1">
                              拟付款金额：<b>¥ {plan.amount.toLocaleString()}</b> | 排期：<b>{plan.plannedDate}</b>
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            {plan.status === "待审批" && (
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => handleApprovePlan(plan.id)}
                                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-sm"
                                >
                                  同意审批
                                </button>
                              </div>
                            )}
                            {plan.status === "已审批" && (
                              <button
                                onClick={() => handlePushToErp(plan.id)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1"
                              >
                                一键下达 ERP
                              </button>
                            )}
                            {plan.status === "已下达" && (
                              <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5" /> 已通过 API 下发
                              </span>
                            )}
                            {plan.status === "已付款" && (
                              <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                                支付结算完成
                              </span>
                            )}
                            {plan.status === "待提报" && (
                              <span className="text-xs text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full font-medium">
                                待采购单元提报
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right 5 columns: Explainer on collaborative gains */}
                  <div className="md:col-span-4 bg-slate-50 p-5 rounded-2xl border border-slate-200/50 flex flex-col gap-4">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      如何替代线下 Excel 汇总？
                    </h4>
                    
                    <div className="flex flex-col gap-3 text-xs text-slate-600 leading-relaxed">
                      <div className="flex gap-2.5">
                        <span className="h-5 w-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">1</span>
                        <p>
                          <b>线上发起</b>：采购经理或子公司出纳点击合同解析完成，数据云端共享。无需繁琐发送 Excel 附件。
                        </p>
                      </div>

                      <div className="flex gap-2.5">
                        <span className="h-5 w-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">2</span>
                        <p>
                          <b>版本控制</b>：云端单一事实来源。每一次微调、修改或延期，皆有 AI 系统底层的修改日志存盘，版本零混乱。
                        </p>
                      </div>

                      <div className="flex gap-2.5">
                        <span className="h-5 w-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">3</span>
                        <p>
                          <b>API 下达</b>：集团总部审批通过后，后台服务通过标准 RESTful 接口秒级写入 ERP 付款池，打通业、财、税一体化终极闭环。
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: AI PM STRATEGIC BLUEPRINT                          */}
        {/* ========================================================= */}
        {activeTab === "blueprint" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fadeIn" id="blueprint-mode-container">
            {/* Left 4 columns: Navigation / Table of Contents */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 text-md mb-3 flex items-center gap-1.5">
                  <FileText className="w-5 h-5 text-blue-600" />
                  产品方案导航册 (PM Dossier)
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  资深 AI 产品经理与企业数字化顾问专为大型集团财务深度定制。
                </p>

                <div className="flex flex-col gap-2 text-xs">
                  <a href="#toc-positioning" className="p-2.5 rounded-lg hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-2 border-l-2 border-transparent hover:border-blue-500">
                    <Building className="w-4 h-4 text-slate-500" /> 1. 产品定位与核心价值
                  </a>
                  <a href="#toc-personas" className="p-2.5 rounded-lg hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-2 border-l-2 border-transparent hover:border-blue-500">
                    <Users className="w-4 h-4 text-slate-500" /> 2. 业财核心角色与场景痛点
                  </a>
                  <a href="#toc-architecture" className="p-2.5 rounded-lg hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-2 border-l-2 border-transparent hover:border-blue-500">
                    <Layers className="w-4 h-4 text-slate-500" /> 3. 产品模块与功能架构
                  </a>
                  <a href="#toc-workflow" className="p-2.5 rounded-lg hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-2 border-l-2 border-transparent hover:border-blue-500">
                    <Workflow className="w-4 h-4 text-slate-500" /> 4. AI 智能匹配核心数据流
                  </a>
                  <a href="#toc-tech" className="p-2.5 rounded-lg hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-2 border-l-2 border-transparent hover:border-blue-500">
                    <ShieldCheck className="w-4 h-4 text-slate-500" /> 5. 技术架构与企业级安全
                  </a>
                  <a href="#toc-roi" className="p-2.5 rounded-lg hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-2 border-l-2 border-transparent hover:border-blue-500">
                    <Calculator className="w-4 h-4 text-slate-500" /> 6. 数字化 ROI 价值收益计算
                  </a>
                </div>
              </div>

              {/* Group Digital ROI Live Calculator in Rail */}
              <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg border border-slate-800" id="roi-interactive-widget">
                <h4 className="font-bold text-md text-sky-400 mb-2 flex items-center gap-1.5">
                  <Calculator className="w-5 h-5" />
                  集团数字化收益实时估算
                </h4>
                <p className="text-[11px] text-slate-400 mb-4">
                  输入您的企业规模，直接量化大模型自动录入和滚动预测为您节省的利息与薪资成本。
                </p>

                <div className="space-y-4 text-xs">
                  {/* Slider 1 */}
                  <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span>年均采购合同数：</span>
                      <span className="font-bold font-mono text-sky-300">{roiContracts} 份</span>
                    </div>
                    <input
                      type="range"
                      min="100"
                      max="5000"
                      step="100"
                      value={roiContracts}
                      onChange={(e) => setRoiContracts(parseInt(e.target.value))}
                      className="w-full accent-sky-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Slider 2 */}
                  <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span>单份合同人工处理耗时：</span>
                      <span className="font-bold font-mono text-sky-300">{roiManualTime} 分钟</span>
                    </div>
                    <input
                      type="range"
                      min="30"
                      max="300"
                      step="10"
                      value={roiManualTime}
                      onChange={(e) => setRoiManualTime(parseInt(e.target.value))}
                      className="w-full accent-sky-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Slider 3 */}
                  <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span>财务平均月薪资 (含五险)：</span>
                      <span className="font-bold font-mono text-sky-300">{roiSalary} 元</span>
                    </div>
                    <input
                      type="range"
                      min="8000"
                      max="40000"
                      step="1000"
                      value={roiSalary}
                      onChange={(e) => setRoiSalary(parseInt(e.target.value))}
                      className="w-full accent-sky-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Slider 4 */}
                  <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span>资金占用利息成本/机会成本：</span>
                      <span className="font-bold font-mono text-sky-300">{roiCapitalHold}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="5"
                      step="0.1"
                      value={roiCapitalHold}
                      onChange={(e) => setRoiCapitalHold(parseFloat(e.target.value))}
                      className="w-full accent-sky-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Results Display */}
                  <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60 mt-4 text-[11px] space-y-2.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400">每年省下人工：</span>
                      <span className="font-bold font-mono text-emerald-400">{annualHoursSaved} 小时</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">节省薪资支出：</span>
                      <span className="font-bold font-mono text-emerald-400">¥ {annualSalarySaved.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">减少资金闲置成本：</span>
                      <span className="font-bold font-mono text-emerald-400">¥ {annualInterestSaved.toLocaleString()}</span>
                    </div>
                    <div className="border-t border-slate-700/60 pt-2 flex justify-between font-bold text-xs">
                      <span className="text-sky-300">合计可量化总收益/年：</span>
                      <span className="font-mono text-sky-300">¥ {(annualSalarySaved + annualInterestSaved).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right 8 columns: Full Blueprint Document Rendered */}
            <div className="lg:col-span-8 flex flex-col gap-8 bg-white p-8 rounded-2xl shadow-sm border border-slate-200" id="blueprint-dossier-scroll">
              
              {/* Section 1 */}
              <section id="toc-positioning" className="scroll-mt-6">
                <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
                  <span className="h-5 w-1.5 bg-blue-600 rounded-full"></span>
                  1. 产品定位与核心价值
                </h3>
                <div className="text-sm text-slate-600 space-y-3.5 leading-relaxed">
                  <p>
                    <b>产品名称</b>：资金计划合同自动录入AI系统（Enterprise AI Cashflow Assistant）
                  </p>
                  <p>
                    <b>产品目标用户</b>：大型企业集团的财务共享中心、资金管理部、供应链采购中心及高管决策层。
                  </p>
                  <p>
                    <b>解决的核心问题</b>：
                    传统大型企业资金计划在<b>编制端</b>完全依赖人工看合同、手工建Excel表格去猜付款时间，且由于系统割裂，无法对齐物流和仓储入库记录，导致编制工作极其繁重，资金计划准确性普遍低于60%、预测滞后，资金占用和利息成本居高不下。
                  </p>
                  <p>
                    <b>核心产品价值</b>：
                    实现将传统的<b>“人工纯手录”</b>被动填报模式，变革为<b>“AI大模型智能解析 + 跨系统业财校验对齐 + 动态滚动自动调整 + 线上审批协同下达”</b>的智能资金计划模式。将资金预测准确率提升至95%以上，编制周期由天缩短到分钟级。
                  </p>
                </div>
              </section>

              {/* Section 2 */}
              <section id="toc-personas" className="scroll-mt-6">
                <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
                  <span className="h-5 w-1.5 bg-blue-600 rounded-full"></span>
                  2. 业财核心角色与痛点分析
                </h3>
                
                <div className="flex flex-col gap-6">
                  {USER_PERSONAS.map((p, idx) => (
                    <div key={idx} className="bg-slate-50 p-5 rounded-xl border border-slate-150 relative">
                      <div className="flex items-center gap-2.5 mb-2.5">
                        <span className="text-2xl">{p.avatar}</span>
                        <div>
                          <h4 className="font-bold text-sm text-slate-800">{p.role}</h4>
                          <p className="text-[11px] text-slate-500 font-medium">{p.title}</p>
                        </div>
                      </div>
                      <div className="space-y-2 text-xs">
                        <p className="text-slate-700"><b>使用场景：</b> {p.scenario}</p>
                        <div className="text-slate-600 space-y-1">
                          <p className="font-bold text-rose-700">典型业务痛点：</p>
                          {p.painPoints.map((pt, ptIdx) => (
                            <p key={ptIdx} className="pl-3.5 relative">
                              <span className="absolute left-1.5 top-2.5 h-1 w-1 bg-rose-600 rounded-full"></span>
                              {pt}
                            </p>
                          ))}
                        </div>
                        <p className="text-slate-700 bg-emerald-50 p-2.5 rounded border border-emerald-100 mt-2">
                          <b className="text-emerald-800">AI 赋能解决方案：</b> {p.aiSolution}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Section 3 */}
              <section id="toc-architecture" className="scroll-mt-6">
                <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
                  <span className="h-5 w-1.5 bg-blue-600 rounded-full"></span>
                  3. 产品模块与功能架构 (Architecture)
                </h3>
                
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700">
                    <div className="bg-white p-3.5 rounded-lg border border-slate-150">
                      <p className="font-bold text-slate-800 mb-1.5 flex items-center gap-1.5 text-blue-600">
                        <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                        合同智能解析模块 (NLP/LLM)
                      </p>
                      <ul className="list-disc pl-4 space-y-1 text-slate-500 text-[11px]">
                        <li>支持PDF、图片、扫描件的高保真OCR排版还原</li>
                        <li>多模态大模型精确匹配合同编号、供应商、总金额</li>
                        <li>复杂的非线性付款账期（预付、到货、尾款、质保）拆解</li>
                        <li>合同履约期到期日基于上下文财务推理与规范化输出</li>
                      </ul>
                    </div>

                    <div className="bg-white p-3.5 rounded-lg border border-slate-150">
                      <p className="font-bold text-slate-800 mb-1.5 flex items-center gap-1.5 text-emerald-600">
                        <span className="h-2 w-2 rounded-full bg-emerald-600"></span>
                        数据自动采集对齐模块 (APIs)
                      </p>
                      <ul className="list-disc pl-4 space-y-1 text-slate-500 text-[11px]">
                        <li>对接SRM系统，校验采购合同PO数量、单价及挂账历史</li>
                        <li>对接WMS系统，获取对应批次物料的实物进厂验收吨数</li>
                        <li>对接海运、陆运物流系统，实时同步在途ETA船舶位置</li>
                        <li>多源数据合并，判断真实合同执行状态，捕获异常偏差</li>
                      </ul>
                    </div>

                    <div className="bg-white p-3.5 rounded-lg border border-slate-150">
                      <p className="font-bold text-slate-800 mb-1.5 flex items-center gap-1.5 text-indigo-600">
                        <span className="h-2 w-2 rounded-full bg-indigo-600"></span>
                        动态滚动预测模块 (Dynamic Rolling)
                      </p>
                      <ul className="list-disc pl-4 space-y-1 text-slate-500 text-[11px]">
                        <li>到货时间延迟自动重新计算后续到货款、尾款到期窗口</li>
                        <li>大宗商品浮动价指数（如普氏指数）实时挂载与暂估重估</li>
                        <li>多系统执行差异触发智能匹配，实时刷新本月兑付预测曲线</li>
                        <li>场景微调沙盘：支持采购量、延迟天数和浮动单价滑块测算</li>
                      </ul>
                    </div>

                    <div className="bg-white p-3.5 rounded-lg border border-slate-150">
                      <p className="font-bold text-slate-800 mb-1.5 flex items-center gap-1.5 text-amber-600">
                        <span className="h-2 w-2 rounded-full bg-amber-600"></span>
                        风险预警与协同审批模块 (Workflow)
                      </p>
                      <ul className="list-disc pl-4 space-y-1 text-slate-500 text-[11px]">
                        <li>大额集中兑付引发临时性流动头寸缺口自动安全黄牌警报</li>
                        <li>合同单价与系统PO不一致或供应商履约风险即时预警</li>
                        <li>总部、子公司业务部、采购部线上协同汇总流转、版本追踪</li>
                        <li>一键API下发挂账付款：直接写入ERP、财务系统减少二次填报</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 4 */}
              <section id="toc-workflow" className="scroll-mt-6">
                <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
                  <span className="h-5 w-1.5 bg-blue-600 rounded-full"></span>
                  4. AI 智能匹配核心工作流程
                </h3>
                
                <div className="text-xs text-slate-600 leading-relaxed space-y-4">
                  <p>
                    系统全生命周期数据流转可以被划分为以下五个核心高精密闭环阶段：
                  </p>

                  <div className="border-l-2 border-blue-500 pl-4 space-y-3">
                    <div>
                      <p className="font-bold text-slate-800 text-xs">阶段一：非结构化合同上传与AI智能解析</p>
                      <p className="text-slate-500 mt-1">
                        <b>输入</b>：Word、扫描件PDF、高精度图像格式采购合同。<br />
                        <b>AI处理逻辑</b>：Gemini大模型配合版面分析与词法分析，高精度提取合同关键核心字典。解析付款节点条款翻译为标准可计算代码。<br />
                        <b>输出</b>：格式化标准JSON。包含账期、金额、违约金率和拟到货期。
                      </p>
                    </div>

                    <div>
                      <p className="font-bold text-slate-800 text-xs">阶段二：业财多源连接与数据合并验证</p>
                      <p className="text-slate-500 mt-1">
                        <b>输入</b>：解析的合同号及供应商标识。<br />
                        <b>AI处理逻辑</b>：自动根据合同号调用SRM采购PO、WMS实物验收数及物流GPS位置。AI执行差异算法，比对“到港时间VS拟提货时间”、“PO价格VS合同价格”。<br />
                        <b>输出</b>：物理世界执行差异清单（如物流因台风延期、铁矿石普氏均价调增等）。
                      </p>
                    </div>

                    <div>
                      <p className="font-bold text-slate-800 text-xs">阶段三：付款排期动态滚动与预警提示</p>
                      <p className="text-slate-500 mt-1">
                        <b>输入</b>：前序物理偏差数据。<br />
                        <b>AI处理逻辑</b>：根据到港延误天数，自动向后推演10个工作日，修正付款日期。根据价格变动，计算最终应付款。若出现集中兑付超过集团头寸红线，触发“资金缺口安全警报”。<br />
                        <b>输出</b>：修正后的滚动资金计划、安全缺口调度建议。
                      </p>
                    </div>

                    <div>
                      <p className="font-bold text-slate-800 text-xs">阶段四：线上审批协同与API直连下达</p>
                      <p className="text-slate-500 mt-1">
                        <b>输入</b>：自动微调后的滚动预测草稿。<br />
                        <b>AI处理逻辑</b>：推送至总部财务、采购单元。支持审批流。通过标准的系统级API完成ERP系统自动账单挂起与付款申请建单。<br />
                        <b>输出</b>：ERP财务单号、核销凭证状态、银行资金池自动配款。
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 5 */}
              <section id="toc-tech" className="scroll-mt-6">
                <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
                  <span className="h-5 w-1.5 bg-blue-600 rounded-full"></span>
                  5. 技术实现方案与安全数据治理
                </h3>
                
                <div className="text-xs text-slate-600 space-y-4 leading-relaxed">
                  <div>
                    <p className="font-bold text-slate-800">1. 大语言模型与智能Agent架构</p>
                    <p className="text-slate-500 mt-1">
                      前端使用 React 进行高流畅度响应式渲染。后端基于 Express 构建，深度整合 <b>Gemini-3.5-flash</b> 多模态提取能力，针对采购合同和财务场景进行微调系统预置词（System Instruction）。同时，应用智能数据比对算法（Simulated Business Logic Matching）充当跨系统 Agent，捕获业务差异并自动触发资金滚动。
                    </p>
                  </div>

                  <div>
                    <p className="font-bold text-slate-800">2. 多源数据集成 (ETL & APIs)</p>
                    <p className="text-slate-500 mt-1">
                      对接企业级 ERP (如 SAP / Oracle)、SRM 及仓储系统 WMS，采用轻量级、标准化 RESTful API 挂载模式，提供标准的 Kafka 消息队列接收交货变更事件，保证物理进度数据的毫秒级准时摄入。
                    </p>
                  </div>

                  <div>
                    <p className="font-bold text-slate-800">3. 金融级安全架构与数据合规</p>
                    <p className="text-slate-500 mt-1">
                      合同及敏感付款涉及企业重大商业机密。本系统遵循以下最高等级合规标准：
                    </p>
                    <ul className="list-disc pl-4 text-slate-500 space-y-1 text-[11px] mt-1">
                      <li><b>全数据链路非对称加密</b>：不论是在途合同文本传输、系统内 API 调用，均采用 AES-256 和 TLS 1.3 技术。</li>
                      <li><b>租户数据物理隔离</b>：在云服务容器（Cloud Run / GKE）中完全启用多租户专有数据安全通道，严防越权渗透。</li>
                      <li><b>角色颗粒级授权 (RBAC)</b>：子公司采购人员仅能查看所属合同及SRM提报进度，集团CFO具备总控面板和审批穿透权限。</li>
                      <li><b>全生命周期脱敏审计</b>：所有AI交互日志不进入任何公共大模型训练集。</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Section 6 */}
              <section id="toc-roi" className="scroll-mt-6">
                <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
                  <span className="h-5 w-1.5 bg-blue-600 rounded-full"></span>
                  6. 企业数字化变革 ROI 量化指标
                </h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mt-3">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-[20px] font-bold text-blue-600 font-mono">98%</p>
                    <p className="text-[10px] text-slate-500 font-medium mt-1">AI 录入契合度</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-[20px] font-bold text-emerald-600 font-mono">-90%</p>
                    <p className="text-[10px] text-slate-500 font-medium mt-1">手工核对工时节省</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-[20px] font-bold text-indigo-600 font-mono">95%+</p>
                    <p className="text-[10px] text-slate-500 font-medium mt-1">资金流滚动准确率</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-[20px] font-bold text-amber-600 font-mono">-18%</p>
                    <p className="text-[10px] text-slate-500 font-medium mt-1">沉淀多余头寸占用</p>
                  </div>
                </div>

                <div className="text-xs text-slate-600 leading-relaxed mt-4 space-y-2">
                  <p>
                    <b>1. 节省人工录入与对账时间 (Direct Labor Savings)</b>：
                    以一个年签署 1,200 份采购合同的集团为例，传统人工逐行阅读、在Excel登记、到SRM录入、再反复打电话对账需耗时近 1,800 个小时。AI大模型解析与自动匹配将单份合同时长由 1.5小时 缩减为 1.5分钟，直接为集团节约 98% 的人力负荷，直接等效节省薪资成本达数十万。
                  </p>
                  <p>
                    <b>2. 降低财务利息与机会资本占用 (Capital Efficiency Boost)</b>：
                    传统“拍脑袋”或滞后的资金计划编制，迫使财务经理保持极高的“常态资金留存缓冲池（通常占采购额的 12% 左右）”。通过AI系统的滚动30天精准排班对齐，实现精细化付款，可以将这一不必要的资金缓冲留存比率拉低近 4.5 个百分点。释放的巨额活期存款在金融市场可以产生可观的机会利息收益或减少债务融资。
                  </p>
                </div>
              </section>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-6 border-t border-slate-800 text-xs mt-12 text-center" id="global-footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-2">
          <p className="font-bold text-slate-200">资金计划合同自动录入AI系统 © 2026</p>
          <p>
            数字化财务变革专家专供。基于 Gemini 3.5 多模态大模型及业财系统深度融合打造。
          </p>
          <div className="flex justify-center gap-4 text-slate-500 pt-1 text-[10px]">
            <span>系统版本: v1.0.4-PRO</span>
            <span>•</span>
            <span>模型引擎: gemini-3.5-flash</span>
            <span>•</span>
            <span>数据保护标准: ISO 27001 & 金融三级合规</span>
          </div>
        </div>
      </footer>

      {/* Base64 Scientific Modal */}
      {showBase64Modal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-sky-400 animate-spin" style={{ animationDuration: '3s' }} />
                <span className="font-bold text-sm">图像二进制 Base64 转码科学视窗</span>
              </div>
              <button 
                onClick={() => setShowBase64Modal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-600 leading-relaxed">
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-xl">
                <p className="font-bold text-blue-900 mb-1 flex items-center gap-1 text-[11px]">
                  <Info className="w-4 h-4" /> 科普：大模型是如何“看懂”一张合同图片的？
                </p>
                <p className="text-slate-700 text-[11px]">
                  图片、扫描件本质上是二进制矩阵（RGB像素点）。大语言模型（如 <b>Gemini 3.5</b> 或 <b>小米 Mimo</b> 视觉大模型）在服务端接收输入时，是以统一的文本或结构化载荷（Payload）形式运行的。
                </p>
                <p className="text-slate-700 text-[11px] mt-2">
                  为了传输图片，前端会在内存中通过 <b>FileReader Base64 算法</b> 将图片二进制流一键转化为标准的 <b>64 个高频字符集序列</b>（包含大写字母、小写字母、数字及 <code>+</code>、<code>/</code>）。这就是您在下方看到的以 <code>data:image/jpeg;base64,...</code> 开头的文本。AI 视觉端解析时，会将此字符重新转换为张量流（Tensors），并完成高保真 OCR 识别与版面分析！
                </p>
              </div>

              <div>
                <p className="font-bold text-slate-800 mb-2">
                  当前上传合同的 Base64 文本片段：
                  <span className="text-slate-400 font-mono font-normal ml-1">
                    (总长度: {fileBase64.length.toLocaleString()} 字符)
                  </span>
                </p>
                <div className="bg-slate-950 text-emerald-400 p-4 rounded-xl font-mono text-[10px] break-all max-h-48 overflow-y-auto border border-slate-900 select-all leading-normal shadow-inner">
                  <span className="text-sky-400 font-bold">{fileBase64.substring(0, 150)}</span>
                  <span className="text-slate-500">... [此处省略中间 {Math.max(0, fileBase64.length - 300).toLocaleString()} 个高频字符] ...</span>
                  <span className="text-sky-400 font-bold">{fileBase64.substring(fileBase64.length - 150)}</span>
                </div>
              </div>

              {/* Attributes */}
              <div className="grid grid-cols-2 gap-3 text-[11px] bg-slate-50 p-3 rounded-xl border border-slate-150">
                <div>
                  <span className="text-slate-400 block">转码算法</span>
                  <span className="font-bold text-slate-700 font-mono">RFC 4648 Base64 标准</span>
                </div>
                <div>
                  <span className="text-slate-400 block">文件前缀 MIME-Type</span>
                  <span className="font-bold text-slate-700 font-mono">{fileBase64.split(";")[0]?.replace("data:", "") || "image/jpeg"}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-4 flex justify-between items-center border-t border-slate-200">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(fileBase64);
                  const btn = document.getElementById("copy-base64-btn");
                  if (btn) {
                    btn.innerText = "✓ 全量 Base64 编码已复制！";
                    btn.classList.remove("bg-slate-900", "hover:bg-slate-800");
                    btn.classList.add("bg-emerald-600");
                    setTimeout(() => {
                      btn.innerText = "📋 复制全量 Base64 字符流";
                      btn.classList.add("bg-slate-900", "hover:bg-slate-800");
                      btn.classList.remove("bg-emerald-600");
                    }, 2000);
                  }
                }}
                id="copy-base64-btn"
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer"
              >
                📋 复制全量 Base64 字符流
              </button>
              <button
                onClick={() => setShowBase64Modal(false)}
                className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer"
              >
                关闭视窗
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
