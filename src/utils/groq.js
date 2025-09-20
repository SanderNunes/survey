export async function queryGroq(messageHistory) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.VITE_APP_GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "mixtral-8x7b-32768",
      messages: messageHistory,
    }),
  });

  const data = await response.json();
  return data.choices[0].message.content;
}
