import { createActor } from "@/backend";
import type {
  Course,
  DashboardStats,
  Lead,
  Payment,
  Student,
  Team,
} from "@/types";
import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery } from "@tanstack/react-query";

export function useGetDashboardStats() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<DashboardStats>({
    queryKey: ["dashboardStats"],
    queryFn: async () => {
      if (!actor) throw new Error("No actor");
      return actor.getDashboardStats() as Promise<DashboardStats>;
    },
    enabled: !!actor && !isFetching,
    staleTime: 30_000,
  });
}

export function useGetLeads() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<Lead[]>({
    queryKey: ["leads"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getLeads() as Promise<Lead[]>;
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetStudents() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<Student[]>({
    queryKey: ["students"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getStudents() as Promise<Student[]>;
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetPayments() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<Payment[]>({
    queryKey: ["payments"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPayments(null) as Promise<Payment[]>;
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetTeams() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<Team[]>({
    queryKey: ["teams"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTeams() as Promise<Team[]>;
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetCourses() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<Course[]>({
    queryKey: ["courses"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getCourses() as Promise<Course[]>;
    },
    enabled: !!actor && !isFetching,
  });
}
