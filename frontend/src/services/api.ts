const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

export type ApiHealth = {
  status: string;
  application: string;
  version: string;
  environment: string;
  simulated?: boolean;
};

export type ApiVersion = {
  application: string;
  version: string;
  environment: string;
};

export type ApiDeployment = {
  strategy: string;
  active_environment: "blue" | "green";
  current_version: string;
  traffic: { blue: number; green: number };
  updated_at: string;
  simulated?: boolean;
};

export type ApiEnvironment = {
  name: string;
  version: string;
  status: string;
  traffic: number;
  health: string;
};

export type ApiEnvironments = {
  blue: ApiEnvironment;
  green: ApiEnvironment;
  simulated?: boolean;
};

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`API request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export async function fetchDashboardData() {
  const [health, version, deployment, environments] = await Promise.all([
    get<ApiHealth>("/health"),
    get<ApiVersion>("/version"),
    get<ApiDeployment>("/deployment"),
    get<ApiEnvironments>("/environments"),
  ]);
  return { health, version, deployment, environments };
}
