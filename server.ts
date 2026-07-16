import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use JSON middleware with increased payload size
  app.use(express.json({ limit: '10mb' }));

  // Initialize Gemini client with proper User-Agent header for telemetry
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API endpoint for Gemini Chat (SegurApp AI Assistant)
  app.post("/api/gemini/chat", async (req: express.Request, res: express.Response) => {
    try {
      const { messages } = req.body;
      if (!messages || !Array.isArray(messages)) {
        res.status(400).json({ error: "Missing or invalid 'messages' array" });
        return;
      }

      const systemInstruction = `
Eres SegurApp AI, el Asistente de Seguridad Inteligente de SegurApp Recorridos Neiva.
Tu misión es brindar recomendaciones de seguridad, asesorar sobre las rutas más seguras en la ciudad de Neiva (Huila, Colombia), y ofrecer asistencia y consejos prácticos a pasajeros y conductores de motocicletas (moto-trabajadores).

Pautas importantes:
1. Sé extremadamente servicial, empático, claro y enfocado en la seguridad vial y personal.
2. Como conoces perfectamente la geografía de Neiva, puedes mencionar barrios populares (como El Jardín, Las Granjas, Ipanema, Buganviles, Cándido, Surorientales, Santa Inés, San Pedro, Alberto Galindo, etc.) y puntos de referencia locales (como la Universidad Surcolombiana - USCO, el Centro Comercial San Pedro Plaza, el Parque Santander, la Avenida Circunvalar, el Terminal de Transportes, el Hospital Universitario, el monumento a la Gaitana, etc.).
3. Si te preguntan por rutas o trayectos en Neiva, sugiere opciones lógicas priorizando avenidas principales bien iluminadas y de alta circulación (como la Carrera 5, Carrera 2, Carrera 15, Avenida La Toma, Avenida Pastrana, Calle 8, Calle 26, Calle 64, etc.) y aconseja evitar zonas desoladas o mal iluminadas, especialmente de noche.
4. Siempre promueve buenas prácticas de seguridad: usar el casco reglamentario abrochado, portar chaleco reflectivo reglamentario después de las 6:00 PM, verificar la placa de la moto y la identidad del conductor antes de subir, compartir el trayecto en tiempo real con los contactos de confianza por WhatsApp, y validar el PIN de seguridad asignado.
5. Mantén tus respuestas concisas, estructuradas con viñetas elegantes cuando sea apropiado, y sumamente legibles en celulares. No incluyas explicaciones de código ni tecnicismos de IA.
`;

      const formattedContents = messages.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: formattedContents,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini API Error in server:", error);
      res.status(500).json({ error: error.message || "Falla al generar respuesta de IA" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
