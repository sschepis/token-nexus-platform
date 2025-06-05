import { useEffect } from 'react';
import { useRouter } from "next/router";
import { useAppSelector } from "@/store/hooks";

const SystemAdminIndexPage = () => {
  const router = useRouter();
  const { permissions } = useAppSelector((state) => state.auth || { permissions: [] });

  useEffect(() => {
    if (permissions.includes("system:admin")) {
      router.replace('/system-admin/deploy');
    } else if (permissions.length > 0) { // Only redirect if permissions have been loaded
      router.replace("/dashboard");
    }
  }, [permissions, router]);

  return <div>Redirecting...</div>;
};

export default SystemAdminIndexPage;