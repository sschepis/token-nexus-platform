
import { useAppSelector } from '../store/hooks';

export const usePermission = () => {
  const { permissions } = useAppSelector((state) => state.auth);

  const hasPermission = (permission: string): boolean => {
    return permissions.includes(permission);
  };

  const checkAnyPermission = (permissionList: string[]): boolean => {
    return permissionList.some(permission => permissions.includes(permission));
  };

  const checkAllPermissions = (permissionList: string[]): boolean => {
    return permissionList.every(permission => permissions.includes(permission));
  };

  return { hasPermission, checkAnyPermission, checkAllPermissions };
};

export default usePermission;
