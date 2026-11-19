/**
 * Application routes with version
 */

const authRoot = 'auth';
const tenantsRoot = 'tenants';
const formsRoot = 'forms';
const clientsRoot = 'clients';

const v1 = 'v1';

export const routesV1 = {
  version: v1,
  auth: {
    root: authRoot,
  },
  tenants: {
    root: tenantsRoot,
  },
  forms: {
    root: formsRoot,
  },
  clients: {
    root: clientsRoot,
  },
};
