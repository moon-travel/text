export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "メソッドエラー" });
  }

  try {
    const { text } = req.body;

    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.NEMOTRON_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "nvidia/nemotron-3-super-120b-a12b",
        messages: [
          {
            role: "system",
            content: `You are a professional English teacher.
Tasks:
1. Correct the sentence
2. Explain mistakes simply
Format:
Corrected:
Explanation:`
          },
          {
            role: "user",
            content: text
          }
        ]
      })
    });

    const data = await response.json();

    res.status(200).json(data);

  } catch (error) {
    res.status(500).json({ error: "サーバーエラー" });
  }
}
