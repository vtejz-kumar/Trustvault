const permissionService = require('../services/permissionService');

async function grantPermission(req, res) {
  await permissionService.grantPermission(req, res);
}

async function revokePermission(req, res) {
  await permissionService.revokePermission(req, res);
}

async function listPermissions(req, res) {
  await permissionService.listPermissions(req, res);
}

async function listUsers(req, res) {
  await permissionService.listUsers(req, res);
}

module.exports = { grantPermission, revokePermission, listPermissions, listUsers };