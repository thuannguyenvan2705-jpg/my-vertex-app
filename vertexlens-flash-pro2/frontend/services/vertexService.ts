import { AnalysisResult } from '../types';

// Chìa khóa của bố
const FIXED_API_KEY = 'AQ.Ab8RN6Il-CgubSVHQ7QUwaRZyR1VGH5gTx7vrtNSVnsiAsxLKQ';

export const analyzeVideosBatch = async (
  batch: { base64: string; mimeType: string; fileName: string }[]
): Promise<(AnalysisResult | null)[]> => {
  try {
    // 1. Chuẩn bị nội dung gửi đi (giống cái ảnh mẫu bố gửi)
    const parts: any[] = batch.flatMap(item => [
      { text: `[VIDEO_START: ${item.fileName}]` },
      { inlineData: { mimeType: item.mimeType, data: item.base64 } },
      { text: `[VIDEO_END: ${item.fileName}]` }
    ]);

    // Thêm yêu cầu phân tích vào cuối
    parts.push({
      text: `Bạn là chuyên gia phân tích video. Hãy phân tích ${batch.length} video này và trả về MẢNG JSON duy nhất.
      
      QUY TẮC:
      1. Trả về đúng ${batch.length} đối tượng JSON trong một mảng [].
      2. fileName phải khớp 100%.
      3. Nội dung Tiếng Việt.
      4. Định dạng 'description': "[Tên file]: '[Mô tả]'. Lời thuyết minh: '[Nội dung thoại]'. Độ dài: [X] giây."
      
      Cấu trúc mẫu: {"fileName": "abc.mp4", "description": "...", "topics": [], "overallSentiment": "", "actionItems": []}`
    });

    // 2. Gọi thẳng đến Google (Thay thế cái curl bố gửi vào đây)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AQ.Ab8RN6Il-CgubSVHQ7QUwaRZyR1VGH5gTx7vrtNSVnsiAsxLKQ`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(JSON.stringify(errorData));
    }

    const data = await response.json();
    
    // 3. Lấy kết quả chữ về và biến nó thành JSON
    const textResponse = data.candidates[0].content.parts[0].text;
    // Làm sạch chuỗi nếu AI trả về kèm ký hiệu ```json
    const cleanJson = textResponse.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleanJson) as AnalysisResult[];

    return batch.map(b => parsed.find(p => p.fileName === b.fileName) || null);

  } catch (e) {
    console.error("Lỗi phân tích rồi bố ơi:", e);
    return new Array(batch.length).fill(null);
  }
};