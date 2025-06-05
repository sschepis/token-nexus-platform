import React from "react";
import Users from "@/components/pages/Users";

/**
 * Users Page
 * 
 * Next.js page component that renders the Users component.
 * All user management functionality is implemented in the Users component
 * to avoid code duplication and maintain a single source of truth.
 */
const UsersPage = () => {
  return <Users />;
};

export default UsersPage;