import { logger } from "../utils/logger.js";
import { config } from "../config/index.js";

export class USSDService {
  constructor() {
    this.enabled = config.ussd.enabled || false;
    this.sessionTimeout = config.ussd.sessionTimeout || 180; // 3 minutes
    this.sessions = new Map();
  }

  async initialize() {
    if (!this.enabled) {
      logger.warn("USSD service is disabled");
      return;
    }

    logger.info("USSD service initialized");
  }

  async handleUSSDRequest(sessionId, phoneNumber, text, serviceCode) {
    try {
      // Get or create session
      let session = this.sessions.get(sessionId);

      if (!session) {
        session = {
          phoneNumber,
          serviceCode,
          state: "menu",
          data: {},
          createdAt: Date.now(),
        };
        this.sessions.set(sessionId, session);
      }

      // Check session timeout
      if (Date.now() - session.createdAt > this.sessionTimeout * 1000) {
        this.sessions.delete(sessionId);
        return this.getTimeoutResponse();
      }

      // Process USSD request based on state
      const response = await this.processSession(session, text);

      // Update session
      this.sessions.set(sessionId, session);

      return response;
    } catch (error) {
      logger.error("USSD request error:", error);
      return this.getErrorResponse();
    }
  }

  async processSession(session, text) {
    const input = text.trim().toLowerCase();

    switch (session.state) {
      case "menu":
        return this.handleMenu(session, input);
      case "check_balance":
        return this.handleCheckBalance(session, input);
      case "check_usage":
        return this.handleCheckUsage(session, input);
      case "recharge":
        return this.handleRecharge(session, input);
      case "support":
        return this.handleSupport(session, input);
      default:
        return this.handleMenu(session, input);
    }
  }

  handleMenu(session, input) {
    if (input === "" || input === "menu") {
      return {
        response:
          "CON Welcome to Micro-Courant\n1. Check Balance\n2. Check Usage\n3. Recharge\n4. Support\n0. Exit",
        continue: true,
      };
    }

    switch (input) {
      case "1":
        session.state = "check_balance";
        return { response: "CON Checking your balance...", continue: true };
      case "2":
        session.state = "check_usage";
        return { response: "CON Checking your usage...", continue: true };
      case "3":
        session.state = "recharge";
        return {
          response: "CON Enter amount to recharge (XLM):",
          continue: true,
        };
      case "4":
        session.state = "support";
        return this.getSupportMenu();
      case "0":
        this.sessions.delete(session.sessionId);
        return {
          response: "END Thank you for using Micro-Courant",
          continue: false,
        };
      default:
        return {
          response:
            "CON Invalid option. Please try again:\n1. Check Balance\n2. Check Usage\n3. Recharge\n4. Support\n0. Exit",
          continue: true,
        };
    }
  }

  async handleCheckBalance(session, input) {
    // In production, this would query the database
    const mockBalance = "50.00";

    session.state = "menu";

    return {
      response: `CON Your current balance: ${mockBalance} XLM\n\n0. Main Menu`,
      continue: true,
    };
  }

  async handleCheckUsage(session, input) {
    // In production, this would query the database
    const mockUsage = "12.5";
    const mockCost = "1.25";

    session.state = "menu";

    return {
      response: `CON Today's usage: ${mockUsage} kWh\nCost: ${mockCost} XLM\n\n0. Main Menu`,
      continue: true,
    };
  }

  async handleRecharge(session, input) {
    if (session.data.step === "confirm") {
      if (input === "1") {
        // Process recharge
        const amount = session.data.amount;
        session.state = "menu";
        session.data = {};

        return {
          response: `END Recharge of ${amount} XLM initiated. You will receive a confirmation SMS shortly.`,
          continue: false,
        };
      } else {
        session.state = "menu";
        session.data = {};
        return {
          response: "CON Recharge cancelled.\n\n0. Main Menu",
          continue: true,
        };
      }
    }

    const amount = parseFloat(input);

    if (isNaN(amount) || amount <= 0) {
      return {
        response: "CON Invalid amount. Please enter a valid amount (XLM):",
        continue: true,
      };
    }

    session.data.amount = amount;
    session.data.step = "confirm";

    return {
      response: `CON Confirm recharge of ${amount} XLM?\n1. Yes\n2. No`,
      continue: true,
    };
  }

  handleSupport(session, input) {
    if (input === "" || input === "support") {
      return this.getSupportMenu();
    }

    switch (input) {
      case "1":
        return {
          response:
            "CON For emergency support, call: +1234567890\n\n0. Main Menu",
          continue: true,
        };
      case "2":
        return {
          response:
            "CON For billing inquiries, email: support@micro-courant.org\n\n0. Main Menu",
          continue: true,
        };
      case "3":
        return {
          response:
            "CON For technical support, visit: micro-courant.org/support\n\n0. Main Menu",
          continue: true,
        };
      case "0":
        session.state = "menu";
        return this.handleMenu(session, "");
      default:
        return this.getSupportMenu();
    }
  }

  getSupportMenu() {
    return {
      response:
        "CON Support Options:\n1. Emergency\n2. Billing\n3. Technical\n0. Main Menu",
      continue: true,
    };
  }

  getTimeoutResponse() {
    return {
      response: "END Session expired. Please dial *123# again.",
      continue: false,
    };
  }

  getErrorResponse() {
    return {
      response: "END An error occurred. Please try again later.",
      continue: false,
    };
  }

  cleanupExpiredSessions() {
    const now = Date.now();
    const timeout = this.sessionTimeout * 1000;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.createdAt > timeout) {
        this.sessions.delete(sessionId);
      }
    }
  }

  async shutdown() {
    this.sessions.clear();
    logger.info("USSD service shutdown");
  }
}
