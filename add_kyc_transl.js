const fs = require('fs');
const file = 'translations/index.ts';
let content = fs.readFileSync(file, 'utf8');

const newEn = `
  "kyc.takePhoto": "Take a Photo",
  "kyc.chooseFromLibrary": "Choose from Library",
  "kyc.selectUploadMethod": "Select Upload Method",`;

const newKo = `
  "kyc.takePhoto": "사진 찍기",
  "kyc.chooseFromLibrary": "라이브러리에서 선택",
  "kyc.selectUploadMethod": "업로드 방법 선택",`;

const newJa = `
  "kyc.takePhoto": "写真を撮る",
  "kyc.chooseFromLibrary": "ライブラリから選択",
  "kyc.selectUploadMethod": "アップロード方法を選択",`;

const newAr = `
  "kyc.takePhoto": "التقاط صورة",
  "kyc.chooseFromLibrary": "اختر من المكتبة",
  "kyc.selectUploadMethod": "حدد طريقة التحميل",`;

function insertAfter(searchStr, newContent) {
  // To avoid duplicate insertions, we check if the new content string or part of it is near the searchStr
  // But since we already might have inserted it for EN, let's just be careful.
  let blockStart = content.indexOf(searchStr);
  if (blockStart === -1) return;
  
  let blockEnd = content.indexOf('};', blockStart);
  let blockContent = content.substring(blockStart, blockEnd);
  
  if (!blockContent.includes('"kyc.takePhoto"')) {
    content = content.replace(searchStr, searchStr + "\\n" + newContent);
    console.log("Added for " + searchStr);
  } else {
    console.log("Already present for " + searchStr);
  }
}

insertAfter('const en: TranslationMap = {', newEn);
insertAfter('const ko: TranslationMap = {', newKo);
insertAfter('const ja: TranslationMap = {', newJa);
insertAfter('const ar: TranslationMap = {', newAr);

fs.writeFileSync(file, content);
console.log("Translations added.");
