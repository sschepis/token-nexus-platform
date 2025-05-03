
import { useAppSelector } from '../store/hooks';

export const usePermission = () => {
  const { permissions } = useAppSelector((state) => state.auth);
  
  // Log permissions when hook is used
  console.log('usePermission hook called with permissions:', permissions);

  const hasPermission = (permission: string): boolean => {
    const result = permissions.includes(permission);
    console.log(`Checking permission: ${permission}, result: ${result}`);
    return result;
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
