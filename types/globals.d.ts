// types/globals.d.ts
export {};

export type Role = string;

declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      role?: Role;
    };
  }
}

/*
declare global = make this type visible globally
CustomJwtSessionClaims = the exact hook point Clerk looks for
declaration merging = TypeScript combines your fields with Clerk’s existing type
runtime session token customization = separate step so the value actually exists
*/
