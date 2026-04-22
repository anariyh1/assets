import {
  createEmployee,
  deleteEmployeeById,
  updateEmployeeById,
} from "@/db/employees";
import type { GraphQLContext } from "@/graphql-gql/context";

type EmployeeInput = Record<string, unknown>;

export const employeeMutations = {
  createEmployee: (
    _: unknown,
    args: { input: EmployeeInput },
    _ctx: GraphQLContext,
  ) => {
    return createEmployee(args.input as never);
  },
  updateEmployee: async (
    _: unknown,
    args: { id: string; input: EmployeeInput },
    _ctx: GraphQLContext,
  ) => {
    return updateEmployeeById(args.id, args.input as never);
  },
  deleteEmployee: (_: unknown, args: { id: string }, _ctx: GraphQLContext) => {
    return deleteEmployeeById(args.id);
  },
};
