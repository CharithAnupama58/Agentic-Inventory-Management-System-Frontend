import api from "./axios";

export const login    = (data) => api.post("/auth/login", data);
export const register = (data) => api.post("/auth/register", data);

export const getProducts   = ()         => api.get("/products");
export const getProduct    = (id)       => api.get(`/products/${id}`);
export const createProduct = (data)     => api.post("/products", data);
export const updateProduct = (id, data) => api.put(`/products/${id}`, data);
export const deleteProduct = (id)       => api.delete(`/products/${id}`);

export const createSale       = (data) => api.post("/sales", data);
export const getSales         = ()     => api.get("/sales");
export const getSale          = (id)   => api.get(`/sales/${id}`);
export const refundSale       = (data) => api.post("/sales/refund", data);
export const getProductCampaign = (id) => api.get(`/sales/campaign/${id}`);

export const getDashboard          = ()      => api.get("/dashboard/summary");
export const getAnalytics          = ()      => api.get("/analytics");
export const getInsights           = ()      => api.get("/insights");
export const getPredictions        = ()      => api.get("/predictions");
export const getProductPrediction  = (id)    => api.get(`/predictions/${id}`);
export const sendChatMessage       = (data)  => api.post("/chat", data);
export const getCampaigns          = ()      => api.get("/chat/campaigns");

export const getInventorySummary   = ()           => api.get("/inventory/summary");
export const getReorderSuggestions = ()           => api.get("/inventory/reorder");
export const acknowledgeReorder    = (id, action) => api.patch(`/inventory/reorder/${id}/acknowledge?action=${action}`);
export const adjustStock           = (data)       => api.post("/inventory/adjust", data);
export const addBatch              = (data)       => api.post("/inventory/batch", data);
export const getProductBatches     = (id)         => api.get(`/inventory/batch/${id}`);
export const getExpiringBatches    = ()           => api.get("/inventory/expiring");
export const getMovementHistory    = (id)         => api.get(`/inventory/history/${id}`);
export const getRecentMovements    = ()           => api.get("/inventory/movements");
