import express from "express";
import { createServer as createViteServer } from "vite";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, "data.json");

interface AppState {
  servers: any[];
  units: any[];
  assignments: any[];
  holidays: any[];
  managerPassword?: string;
  lastUpdated?: number;
}

const INITIAL_SERVERS: string[] = [
  "ALANA", "ALTEMIR", "ANELISE", "AUGUSTO", "CASSIA", "CASSIANE", "CLÁUDIA", 
  "CRISTINE", "DANIELE", "FERNANDA", "FILIPE CARGNELUTTI", "GABRIEL AQUINO", 
  "GUSTAVO ZAMARCHI", "HUMBERTO", "ISADORA", "IZABEL", "JOSÉ", "JULIANA SOARES", 
  "LUIZ FILIPE", "LIEGE", "MAURÍCIO", "MIGUEL", "NATHÁLIA ZART", "SAMUEL", 
  "SÉRGIO", "TATIANA PELENZ", "TATIANA SIMÕES", "VANESSA", "YURI",
  "GIOVANA (ESTAG.)", "LAURA (ESTAG.)", "MAUREN (ESTAG.)", "PEDRO (ESTAG.)", 
  "JULIANA LOPES (ESTAG.)", "CAROLINA (ESTAG.)", "ANTHONY (ESTAG.)"
];

const INITIAL_UNIT_CONFIGS: { name: string; division: string }[] = [
  { name: "3° JUIZADO POA", division: 'normal' },
  { name: "ALVORADA", division: 'even_odd' },
  { name: "ARROIO DO MEIO", division: 'normal' },
  { name: "ARROIO DO TIGRE", division: 'normal' },
  { name: "BARRA DO RIBEIRO", division: 'normal' },
  { name: "CAÇAPAVA DO SUL", division: 'normal' },
  { name: "CACHOEIRA DO SUL", division: 'normal' },
  { name: "CACHOEIRINHA", division: 'normal' },
  { name: "CAMAQUÃ", division: 'normal' },
  { name: "CAMPINA DAS MISSÕES", division: 'normal' },
  { name: "CAMPO BOM", division: 'normal' },
  { name: "CANDELÁRIA", division: 'normal' },
  { name: "CANOAS", division: 'normal' },
  { name: "CAPÃO DA CANOA", division: 'normal' },
  { name: "CARAZINHO", division: 'normal' },
  { name: "CARLOS BARBOSA", division: 'normal' },
  { name: "CASCA", division: 'normal' },
  { name: "CHARQUEADAS", division: 'normal' },
  { name: "CRUZ ALTA", division: 'normal' },
  { name: "DOIS IRMÃOS", division: 'normal' },
  { name: "ENCANTADO", division: 'normal' },
  { name: "ENCRUZILHADA", division: 'normal' },
  { name: "ESPUMOSO", division: 'normal' },
  { name: "ESTÂNCIA VELHA", division: 'normal' },
  { name: "ESTEIO", division: 'normal' },
  { name: "ESTRELA", division: 'normal' },
  { name: "FARROUPILHA", division: 'normal' },
  { name: "FREDERICO", division: 'normal' },
  { name: "GARIBALDI", division: 'normal' },
  { name: "GETÚLIO VARGAS", division: 'normal' },
  { name: "GRAMADO", division: 'normal' },
  { name: "GUAPORÉ", division: 'normal' },
  { name: "IBIRUBÁ", division: 'normal' },
  { name: "IGREJINHA", division: 'normal' },
  { name: "IJUÍ", division: 'even_odd' },
  { name: "ITAQUI", division: 'normal' },
  { name: "JEC PASSO FUNDO", division: 'even_odd' },
  { name: "JEC PELOTAS", division: 'normal' },
  { name: "JEC SANTA MARIA", division: 'even_odd' },
  { name: "JEFAZ PASSO FUNDO", division: 'normal' },
  { name: "JEFAZ PELOTAS", division: 'even_odd' },
  { name: "JEFAZ SANTA MARIA", division: 'normal' },
  { name: "JAGUARÃO", division: 'normal' },
  { name: "JÚLIO DE CASTILHOS", division: 'normal' },
  { name: "LAGOA VERMELHA", division: 'normal' },
  { name: "LAJEADO", division: 'normal' },
  { name: "MARAU", division: 'normal' },
  { name: "NONOAI", division: 'normal' },
  { name: "NOVA PRATA", division: 'normal' },
  { name: "NÚCLEO ENCHENTES", division: 'digits' },
  { name: "OSÓRIO", division: 'normal' },
  { name: "PAROBÉ", division: 'normal' },
  { name: "PIRATINI", division: 'normal' },
  { name: "POA10JERP", division: 'normal' },
  { name: "POA1PJERP (posto)", division: 'normal' },
  { name: "PSF2PJE", division: 'normal' },
  { name: "RIO GRANDE", division: 'digits' },
  { name: "ROSÁRIO", division: 'normal' },
  { name: "SANTA ROSA", division: 'normal' },
  { name: "SANTANA LIVRAMENTO", division: 'normal' },
  { name: "SANTO ÂNGELO", division: 'normal' },
  { name: "SANTO ANTÔNIO DA PATRULHA", division: 'normal' },
  { name: "SÃO JERÔNIMO", division: 'normal' },
  { name: "SÃO LEOPOLDO", division: 'even_odd' },
  { name: "SÃO LUIZ GONZAGA", division: 'normal' },
  { name: "SÃO MARCOS", division: 'normal' },
  { name: "SÃO SEBASTIÃO DO CAÍ", division: 'normal' },
  { name: "SÃO VALENTIM", division: 'normal' },
  { name: "SAPIRANGA", division: 'normal' },
  { name: "SAPUCAIA DO SUL", division: 'normal' },
  { name: "SARANDI", division: 'normal' },
  { name: "SEBERI", division: 'normal' },
  { name: "SOLEDADE", division: 'normal' },
  { name: "TAPEJARA", division: 'normal' },
  { name: "TAPES", division: 'normal' },
  { name: "TENENTE PORTELA", division: 'normal' },
  { name: "TORRES", division: 'normal' },
  { name: "TRAMANDAÍ", division: 'normal' },
  { name: "TRÊS DE MAIO", division: 'normal' },
  { name: "VACARIA JEFAZ", division: 'normal' },
  { name: "VENÂNCIO AIRES", division: 'normal' },
  { name: "VERA CRUZ", division: 'normal' },
  { name: "VIAMÃO", division: 'normal' },
  { name: "SÃO JOSÉ DO NORTE", division: 'normal' },
  { name: "MOSTARDAS", division: 'normal' },
  { name: "SANTO AUGUSTO", division: 'normal' },
  { name: "CRISSIUMAL", division: 'normal' },
  { name: "PALMEIRA DAS MISSÕES", division: 'normal' },
  { name: "NOVO HAMBURGO", division: 'normal' },
  { name: "SANTO CRISTO", division: 'normal' },
  { name: "IVOTI", division: 'normal' },
  { name: "TAQUARA", division: 'normal' },
  { name: "SOBRADINHO", division: 'normal' },
  { name: "SANANDUVA", division: 'normal' },
  { name: "ARROIO GRANDE", division: 'normal' },
  { name: "VACARIA", division: 'normal' },
  { name: "NOVA PETRÓPOLIS", division: 'normal' },
  { name: "SÃO FRANCISCO DE ASSIS", division: 'normal' },
  { name: "CAMPO NOVO", division: 'normal' },
  { name: "TAQUARI", division: 'normal' },
  { name: "GAURAMA", division: 'normal' },
  { name: "SANTIAGO", division: 'normal' },
  { name: "GIRUÁ", division: 'normal' },
  { name: "TUPANCIRETÃ", division: 'normal' },
  { name: "CACEQUI", division: 'normal' },
  { name: "RESTINGA SECA", division: 'normal' },
  { name: "RODEIO BONITO", division: 'normal' },
  { name: "BOM JESUS", division: 'normal' },
  { name: "SÃO BORJA", division: 'normal' },
  { name: "SÃO PEDRO DO SUL", division: 'normal' },
  { name: "PORTÃO", division: 'normal' },
  { name: "SANTA BÁRBARA DO SUL", division: 'normal' }
];

const MAPPING: Record<string, string[]> = {
  "ALANA": ["TORRES", "RIO GRANDE:d1"],
  "ALTEMIR": ["CRUZ ALTA", "GETÚLIO VARGAS", "GARIBALDI", "CANDELÁRIA"],
  "ANELISE": ["NÚCLEO ENCHENTES:d2", "POA1PJERP (posto)"],
  "AUGUSTO": ["ALVORADA:odd", "SÃO JERÔNIMO", "JEFAZ PELOTAS:odd", "ITAQUI"],
  "CASSIA": ["JEFAZ PASSO FUNDO", "JEFAZ PELOTAS:even", "JEFAZ SANTA MARIA"],
  "CASSIANE": ["SANTA ROSA", "PAROBÉ", "CAÇAPAVA DO SUL"],
  "CLÁUDIA": ["ESTEIO", "ROSÁRIO", "FARROUPILHA", "FREDERICO", "SÃO VALENTIM"],
  "CRISTINE": ["3° JUIZADO POA", "ALVORADA:even", "NÚCLEO ENCHENTES:d3"],
  "DANIELE": ["SAPUCAIA DO SUL", "CACHOEIRINHA"],
  "FERNANDA": ["SANTANA LIVRAMENTO", "SOLEDADE", "NONOAI", "ARROIO DO TIGRE"],
  "FILIPE CARGNELUTTI": ["CAPÃO DA CANOA", "TENENTE PORTELA", "ARROIO DO MEIO", "GUAPORÉ"],
  "GABRIEL AQUINO": ["NOVA PRATA", "IBIRUBÁ", "TRÊS DE MAIO"],
  "GUSTAVO ZAMARCHI": ["RIO GRANDE:d3", "SANTO ANTÔNIO DA PATRULHA", "SÃO LEOPOLDO:odd"],
  "HUMBERTO": ["SÃO LEOPOLDO:even", "TRAMANDAÍ"],
  "ISADORA": ["ENCANTADO", "CAMPO BOM", "VERA CRUZ", "CACHOEIRA DO SUL"],
  "IZABEL": ["JEC PASSO FUNDO:even", "JEC PELOTAS", "POA10JERP"],
  "JOSÉ": ["VIAMÃO", "ESTÂNCIA VELHA", "PSF2PJE"],
  "JULIANA SOARES": ["DOIS IRMÃOS", "CAMPINA DAS MISSÕES", "CASCA"],
  "LUIZ FILIPE": ["OSÓRIO", "RIO GRANDE:d2"],
  "LIEGE": ["LAJEADO", "TAPES", "SARANDI", "TAPEJARA"],
  "MAURÍCIO": ["NÚCLEO ENCHENTES:d1"],
  "MIGUEL": ["SÃO LUIZ GONZAGA", "SEBERI", "JEC SANTA MARIA:odd"],
  "NATHÁLIA ZART": ["VENÂNCIO AIRES", "CHARQUEADAS"],
  "SAMUEL": ["CARLOS BARBOSA", "MARAU", "LAGOA VERMELHA"],
  "SÉRGIO": ["JAGUARÃO", "PIRATINI", "SÃO MARCOS", "JÚLIO DE CASTILHOS"],
  "TATIANA PELENZ": ["SÃO SEBASTIÃO DO CAÍ", "ESTRELA", "BARRA DO RIBEIRO", "GRAMADO"],
  "TATIANA SIMÕES": ["VACARIA JEFAZ", "ENCRUZILHADA", "IGREJINHA", "SANTO ÂNGELO"],
  "VANESSA": ["CARAZINHO", "CANOAS"],
  "YURI": ["SAPIRANGA", "JEC SANTA MARIA:even"],
  "GIOVANA (ESTAG.)": ["SÃO JOSÉ DO NORTE", "MOSTARDAS", "SANTO AUGUSTO", "CRISSIUMAL"],
  "LAURA (ESTAG.)": ["NOVO HAMBURGO", "SANTO CRISTO", "IVOTI", "PALMEIRA DAS MISSÕES"],
  "MAUREN (ESTAG.)": ["JEC PASSO FUNDO:odd", "TAQUARA", "SOBRADINHO", "SANANDUVA", "ARROIO GRANDE"],
  "PEDRO (ESTAG.)": ["VACARIA", "NOVA PETRÓPOLIS", "ESPUMOSO"],
  "JULIANA LOPES (ESTAG.)": ["SÃO FRANCISCO DE ASSIS", "CAMPO NOVO", "TAQUARI", "GAURAMA"],
  "CAROLINA (ESTAG.)": ["SANTIAGO", "GIRUÁ", "TUPANCIRETÃ", "CACEQUI", "RESTINGA SECA", "RODEIO BONITO"],
  "ANTHONY (ESTAG.)": ["BOM JESUS", "SÃO BORJA", "SÃO PEDRO DO SUL", "PORTÃO", "SANTA BÁRBARA DO SUL"]
};

function getInitialState(): AppState {
  const servers = INITIAL_SERVERS.map(name => ({ id: `s-${name}`, name, status: 'active' }));
  const units = INITIAL_UNIT_CONFIGS.map(cfg => ({ id: `u-${cfg.name}`, name: cfg.name, division: cfg.division, processes: 0 }));
  
  const assignments: any[] = [];
  const DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];

  Object.entries(MAPPING).forEach(([srvName, unitList]) => {
    const srvId = `s-${srvName}`;
    unitList.forEach(uStr => {
      const [uName, sub] = uStr.split(':');
      const uId = `u-${uName}`;
      const fullId = sub ? `${uId}:${sub}` : uId;
      DAYS.forEach(day => {
        assignments.push({ unitId: fullId, day, titularId: srvId, substituteId: null });
      });
    });
  });

  return {
    servers,
    units,
    assignments,
    holidays: [],
    managerPassword: "Gestor123"
  };
}

let state: AppState = getInitialState();

// Load state from file if exists
if (fs.existsSync(DATA_FILE)) {
  try {
    state = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch (e) {
    console.error("Error loading data.json", e);
  }
}

function saveState() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });

  app.use(express.json());

  // API for password management (optional, can be done via WS too)
  app.get("/api/state", (req, res) => {
    res.json(state);
  });

  const broadcast = (sender: WebSocket | null, message: any) => {
    const data = JSON.stringify(message);
    let count = 0;
    wss.clients.forEach((client) => {
      if (client !== sender && client.readyState === WebSocket.OPEN) {
        client.send(data);
        count++;
      }
    });
    console.log(`Broadcasted ${message.type} to ${count} clients`);
  };

  // WebSocket handling
  wss.on("connection", (ws: WebSocket) => {
    console.log("New client connected. Total clients:", wss.clients.size);
    
    // Send initial state
    ws.send(JSON.stringify({ type: "INIT", payload: state }));

    ws.on("message", (data: string) => {
      try {
        const message = JSON.parse(data);
        console.log(`Received ${message.type} from client`);

        switch (message.type) {
          case "REQUEST_SYNC":
            console.log("Sync requested by client");
            ws.send(JSON.stringify({ type: "STATE_UPDATED", payload: state }));
            break;
          case "UPDATE_STATE":
            state = { ...state, ...message.payload, lastUpdated: Date.now() };
            saveState();
            broadcast(ws, { type: "STATE_UPDATED", payload: state });
            break;
          case "UPDATE_PASSWORD":
            state.managerPassword = message.payload;
            state.lastUpdated = Date.now();
            saveState();
            broadcast(null, { type: "PASSWORD_UPDATED", payload: state.managerPassword });
            break;
        }
      } catch (e) {
        console.error("Error processing message", e);
      }
    });

    ws.on("close", () => {
      console.log("Client disconnected. Remaining clients:", wss.clients.size);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
