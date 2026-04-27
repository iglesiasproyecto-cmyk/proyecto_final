#!/usr/bin/env node

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

class SupabaseMCP {
  constructor() {
    this.tools = [
      {
        name: "query_database",
        description: "Execute a SQL query against the Supabase database",
        input_schema: {
          type: "object",
          properties: {
            sql: {
              type: "string",
              description: "SQL query to execute",
            },
          },
          required: ["sql"],
        },
      },
      {
        name: "list_tables",
        description: "List all tables in the database",
        input_schema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_table_schema",
        description: "Get the schema of a specific table",
        input_schema: {
          type: "object",
          properties: {
            table_name: {
              type: "string",
              description: "Name of the table",
            },
          },
          required: ["table_name"],
        },
      },
      {
        name: "read_table_data",
        description: "Read data from a specific table",
        input_schema: {
          type: "object",
          properties: {
            table: {
              type: "string",
              description: "Table name",
            },
            limit: {
              type: "integer",
              description: "Limit results (default 10)",
              default: 10,
            },
            filters: {
              type: "object",
              description: "Simple filters as key-value pairs",
            },
          },
          required: ["table"],
        },
      },
    ];
  }

  async queryDatabase(sql) {
    try {
      const { data, error } = await supabase.rpc("execute_sql", { sql_query: sql });
      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async listTables() {
    try {
      const { data, error } = await supabase
        .from("information_schema.tables")
        .select("table_name")
        .eq("table_schema", "public");

      if (error) throw error;
      return { success: true, tables: data?.map((t) => t.table_name) || [] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async getTableSchema(tableName) {
    try {
      const { data, error } = await supabase
        .from("information_schema.columns")
        .select("*")
        .eq("table_name", tableName)
        .eq("table_schema", "public");

      if (error) throw error;
      return { success: true, schema: data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async readTableData(table, limit = 10, filters = {}) {
    try {
      let query = supabase.from(table).select("*").limit(limit);

      for (const [key, value] of Object.entries(filters)) {
        query = query.eq(key, value);
      }

      const { data, error } = await query;
      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async handleToolCall(toolName, toolInput) {
    switch (toolName) {
      case "query_database":
        return await this.queryDatabase(toolInput.sql);
      case "list_tables":
        return await this.listTables();
      case "get_table_schema":
        return await this.getTableSchema(toolInput.table_name);
      case "read_table_data":
        return await this.readTableData(
          toolInput.table,
          toolInput.limit || 10,
          toolInput.filters || {}
        );
      default:
        return { error: `Unknown tool: ${toolName}` };
    }
  }

  getTools() {
    return this.tools;
  }
}

const mcp = new SupabaseMCP();
console.log("Supabase MCP Server started");
console.log("Available tools:", mcp.getTools().map((t) => t.name));
