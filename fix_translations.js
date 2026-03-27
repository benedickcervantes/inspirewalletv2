const fs = require('fs');

const file = 'translations/index.ts';
let content = fs.readFileSync(file, 'utf8');

const newEn = `
  "deposit.missingRequestId": "Missing Request ID. Please go back and try again.",
  "deposit.receiptUploadFailed": "Receipt upload failed: ",
  "deposit.timeDepositCreatedUploadFailed": "Time Deposit Created, but receipt upload failed: ",
  "deposit.pleaseContactSupport": ". Please contact support.",
  "deposit.optional": "(Optional)",
  "deposit.acceptedFormats": "JPG, PNG or PDF (Max 5MB)",
  "deposit.timeDepositSuccessMessage": "Your time deposit request has been submitted successfully and the amount has been deducted from your available balance.",
  "dashboard.underMaintenance": "Under maintenance",
  "dashboard.maintenanceMessage": "This service is currently under maintenance. We're working hard to bring you an improved experience. Please check back soon!",
  "dashboard.gotIt": "Got it",
`;

const newKo = `
  "deposit.missingRequestId": "요청 ID가 누락되었습니다. 뒤로 돌아가서 다시 시도하십시오.",
  "deposit.receiptUploadFailed": "영수증 업로드에 실패했습니다: ",
  "deposit.timeDepositCreatedUploadFailed": "정기 예금이 생성되었지만 영수증 업로드에 실패했습니다: ",
  "deposit.pleaseContactSupport": ". 지원팀에 문의하십시오.",
  "deposit.optional": "(선택 사항)",
  "deposit.acceptedFormats": "JPG, PNG 또는 PDF (최대 5MB)",
  "deposit.timeDepositSuccessMessage": "정기 예금 요청이 성공적으로 제출되었으며 사용 가능한 잔액에서 금액이 차감되었습니다.",
  "dashboard.underMaintenance": "유지보수 중",
  "dashboard.maintenanceMessage": "이 서비스는 현재 유지보수 중입니다. 더 나은 경험을 제공하기 위해 최선을 다하고 있습니다. 나중에 다시 확인해 주세요!",
  "dashboard.gotIt": "확인",
`;

const newJa = `
  "deposit.missingRequestId": "リクエストIDがありません。戻ってやり直してください。",
  "deposit.receiptUploadFailed": "領収書のアップロードに失敗しました: ",
  "deposit.timeDepositCreatedUploadFailed": "定期預金は作成されましたが、領収書のアップロードに失敗しました: ",
  "deposit.pleaseContactSupport": "。サポートにお問い合わせください。",
  "deposit.optional": "(任意)",
  "deposit.acceptedFormats": "JPG、PNGまたはPDF (最大5MB)",
  "deposit.timeDepositSuccessMessage": "定期預金のリクエストが正常に送信され、利用可能な残高から金額が差し引かれました。",
  "dashboard.underMaintenance": "メンテナンス中",
  "dashboard.maintenanceMessage": "このサービスは現在メンテナンス中です。より良い体験を提供するために努めています。後でもう一度ご確認ください！",
  "dashboard.gotIt": "了解",
`;

const newAr = `
  "deposit.missingRequestId": "معرف الطلب مفقود. يرجى العودة والمحاولة مرة أخرى.",
  "deposit.receiptUploadFailed": "فشل تحميل الإيصال: ",
  "deposit.timeDepositCreatedUploadFailed": "تم إنشاء الوديعة لأجل، لكن فشل تحميل الإيصال: ",
  "deposit.pleaseContactSupport": ". يرجى الاتصال بالدعم.",
  "deposit.optional": "(اختياري)",
  "deposit.acceptedFormats": "JPG أو PNG أو PDF (بحد أقصى 5 ميجابايت)",
  "deposit.timeDepositSuccessMessage": "تم إرسال طلب الوديعة لأجل بنجاح وتم خصم المبلغ من رصيدك المتاح.",
  "dashboard.underMaintenance": "تحت الصيانة",
  "dashboard.maintenanceMessage": "هذه الخدمة قيد الصيانة حالياً. نحن نعمل بجد لتقديم تجربة أفضل. يرجى التحقق لاحقاً!",
  "dashboard.gotIt": "فهمت",
`;

// Insert after "deposit.requiredReason": "..." or similar, or just before the end of each object
// we can do simple array split and insert.

const insertTranslations = (langStr, newContent) => {
  const marker = Object.keys(newContent).length > 0 ? `const ${langStr}: TranslationMap = {` : "";
  if (!marker) return content;
  
  if (content.includes(`"deposit.missingRequestId":`)) {
    console.log("Already has translation for deposit.missingRequestId");
    return content;
  }
  
  // Find the end of common or something, let's just insert right after the const xx = { declaration
  content = content.replace(marker, marker + "\\n" + newContent);
};

insertTranslations('en', newEn);
insertTranslations('ko', newKo);
insertTranslations('ja', newJa);
insertTranslations('ar', newAr);

fs.writeFileSync(file, content);
console.log("Translations updated");
