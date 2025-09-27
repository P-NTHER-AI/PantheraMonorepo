import { useCallback, useEffect, useMemo, useState } from "react";
import bondingCurveService, { type GraduationStatus as ServiceGraduationStatus } from "../services/bondingCurve";

export interface ProfessionalGraduationMetrics {
  reserveRatio: number;
  graduationVelocity: number;
  estimatedDaysToGraduation: number | null;
  riskLevel: "low" | "medium" | "high";
  performanceScore: number;
  liquidityScore: number;
  priceStability: "stable" | "volatile" | "unknown";
}

export interface GraduationStatus {
  isGraduated: boolean;
  currentReserve: number;
  graduationThreshold: number;
  progressPercentage: number;
  remainingToGraduation: number;
  marketCap: number;
  currentPrice: number;
  loading: boolean;
  error: string | null;
  lastUpdate: Date | null;
}

const DEFAULT_THRESHOLD = 30000;

const calculateProfessionalMetrics = (status: GraduationStatus): ProfessionalGraduationMetrics => {
  const { isGraduated, currentReserve, graduationThreshold, progressPercentage, marketCap, currentPrice } = status;

  const reserveRatio = graduationThreshold > 0 ? currentReserve / graduationThreshold : 0;
  const graduationVelocity = progressPercentage > 0 ? progressPercentage / 100 : 0;

  const estimatedDaysToGraduation = isGraduated
    ? null
    : progressPercentage > 0
    ? Math.ceil((100 - progressPercentage) / Math.max(progressPercentage / 30, 0.1))
    : null;

  const riskLevel: "low" | "medium" | "high" = isGraduated
    ? "low"
    : progressPercentage > 80
    ? "low"
    : progressPercentage > 50
    ? "medium"
    : "high";

  const performanceScore = isGraduated ? 100 : Math.min(progressPercentage + (marketCap > 100000 ? 10 : 0), 100);
  const liquidityScore = Math.min((currentReserve / 10000) * 100, 100);
  const priceStability: "stable" | "volatile" | "unknown" = currentPrice > 0 ? "stable" : "unknown";

  return {
    reserveRatio,
    graduationVelocity,
    estimatedDaysToGraduation,
    riskLevel,
    performanceScore,
    liquidityScore,
    priceStability,
  };
};

const mapServiceToStatus = (service: ServiceGraduationStatus): GraduationStatus => {
  const graduationThreshold = service.marketCap > 0 ? service.marketCap : DEFAULT_THRESHOLD;
  const progressPercentage = graduationThreshold > 0 ? Math.min((service.reserveBalance / graduationThreshold) * 100, 100) : 0;
  const remainingToGraduation = Math.max(graduationThreshold - service.reserveBalance, 0);

  return {
    isGraduated: service.isGraduated,
    currentReserve: service.reserveBalance,
    graduationThreshold,
    progressPercentage,
    remainingToGraduation,
    marketCap: service.marketCap,
    currentPrice: service.currentPrice,
    loading: false,
    error: service.error ?? null,
    lastUpdate: new Date(service.lastUpdate),
  };
};

export const useGraduationStatus = (tokenAddress: string, autoRefresh = false) => {
  const [status, setStatus] = useState<GraduationStatus>({
    isGraduated: false,
    currentReserve: 0,
    graduationThreshold: DEFAULT_THRESHOLD,
    progressPercentage: 0,
    remainingToGraduation: DEFAULT_THRESHOLD,
    marketCap: 0,
    currentPrice: 0,
    loading: true,
    error: null,
    lastUpdate: null,
  });

  const fetchGraduationStatus = useCallback(async () => {
    if (!tokenAddress) return;

    setStatus((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const serviceStatus = await bondingCurveService.getGraduationStatus(tokenAddress);
      setStatus(mapServiceToStatus(serviceStatus));
    } catch (error) {
      console.error("Failed to load graduation status", error);
      setStatus((prev) => ({
        ...prev,
        loading: false,
        error: "Unable to load graduation status",
      }));
    }
  }, [tokenAddress]);

  useEffect(() => {
    fetchGraduationStatus();
  }, [fetchGraduationStatus]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchGraduationStatus, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchGraduationStatus]);

  const metrics = useMemo(() => calculateProfessionalMetrics(status), [status]);

  return {
    ...status,
    metrics,
    refresh: fetchGraduationStatus,
  };
};

export default useGraduationStatus;
