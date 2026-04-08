import { GoogleGenAI, Type } from '@google/genai';
import { AnalysisResult } from '../types';

const FIXED_API_KEY = 'AQ.Ab8RN6Il-CgubSVHQ7QUwaRZyR1VGH5gTx7vrtNSVnsiAsxLKQ';
const ai = new GoogleGenAI({ apiKey: FIXED_API_KEY, vertexai: true });

export const analyzeVideosBatch = async (
  batch: { base64: string; mimeType: string; fileName: string }[]
): Promise<(AnalysisResult | null)[]> => {
  try {
    const parts: any[] = [];
    for (const item of batch) {
      parts.push({ text: `[VIDEO_START: ${item.fileName}]` });
      parts.push({ inlineData: { mimeType: item.mimeType, data: item.base64 } });
      parts.push({ text: `[VIDEO_END: ${item.fileName}]` });
    }

    parts.push({
      text: `Bạn là chuyên gia phân tích video. Hãy phân tích ${batch.length} video này và trả về MẢNG JSON duy nhất.
      
      QUY TẮC BẮT BUỘC:
      1. Trả về đúng ${batch.length} đối tượng JSON.
      2. fileName phải khớp 100% với tên file trong [VIDEO_START: ...].
      3. Nội dung phải là Tiếng Việt.
      4. Định dạng trường 'description' PHẢI là: "[Tên file]: '[Mô tả hình ảnh ít nhất 3 câu]'. Lời thuyết minh: '[Nội dung thoại]'. Độ dài: [X] giây."
      5. Dấu nháy đơn ' phải bao quanh phần mô tả và phần lời thuyết minh.
      
      Cấu trúc JSON:
      {
        "fileName": "string",
        "description": "string",
        "topics": ["string", "string", "string"],
        "overallSentiment": "string",
        "actionItems": ["string"]
      }
      
      Ví dụ: {"fileName": "TH251_001.mp4", "description": "TH251_001.mp4: 'Nhóm người tham quan di tích khảo cổ ngoài trời. Những tảng đá lớn được sắp đặt dưới đất. Cảnh quay flycam bao quát toàn bộ khu vực.' Lời thuyết minh: '...even returned to check what was left...'. Độ dài: 3 giây.", "topics": ["khảo cổ", "du lịch", "lịch sử"], "overallSentiment": "Trang nghiêm", "actionItems": ["Giới thiệu khu di tích", "Tình trạng tảng đá"]}
      
      Không trả về văn bản thừa ngoài khối JSON.`
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { role: 'user', parts },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              fileName: { type: Type.STRING },
              description: { type: Type.STRING },
              topics: { type: Type.ARRAY, items: { type: Type.STRING } },
              overallSentiment: { type: Type.STRING },
              actionItems: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['fileName', 'description', 'topics', 'overallSentiment', 'actionItems']
          }
        }
      }
    });

    const parsed = JSON.parse(response.text) as AnalysisResult[];
    return batch.map(b => parsed.find(p => p.fileName === b.fileName) || null);
  } catch (e) {
    console.error("Batch analysis error:", e);
    return new Array(batch.length).fill(null);
  }
};