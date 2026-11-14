/**
 * Shared CRUD factory for the HR master-configuration modules
 * (Leave Types, Shifts, Salary Structures, Salary Advances, Payroll Adjustments).
 *
 * The four modules that carry their own domain logic — Employees, Biometric
 * Attendance, Leave Requests and Payroll — implement their controllers by hand.
 */

/**
 * @param {object} cfg
 * @param {import('mongoose').Model} cfg.Model
 * @param {string} cfg.entity             Human-readable entity name, e.g. 'Leave type'.
 * @param {(req) => object} cfg.buildQuery  Turns the request into a Mongo filter.
 * @param {(docs) => object} [cfg.buildKpis] Optional KPI payload for the list response.
 * @param {(body, doc) => object} [cfg.beforeSave] Optional mutation applied before save.
 */
export const buildCrud = ({ Model, entity, buildQuery, buildKpis, beforeSave }) => {
  const list = async (req, res, next) => {
    try {
      const query = buildQuery ? buildQuery(req) : {};
      const docs = await Model.find(query).sort({ createdAt: -1 });
      const payload = { success: true, message: `${entity}s retrieved successfully`, data: docs };
      if (buildKpis) payload.kpis = buildKpis(docs);
      return res.status(200).json(payload);
    } catch (error) {
      return next(error);
    }
  };

  const getById = async (req, res, next) => {
    try {
      const doc = await Model.findById(req.params.id);
      if (!doc) {
        return res.status(404).json({ success: false, message: `${entity} not found` });
      }
      return res.status(200).json({ success: true, message: `${entity} retrieved successfully`, data: doc });
    } catch (error) {
      return next(error);
    }
  };

  const create = async (req, res, next) => {
    try {
      const payload = beforeSave ? beforeSave(req.body, null) : req.body;
      const doc = await Model.create(payload);
      return res.status(201).json({ success: true, message: `${entity} created successfully`, data: doc });
    } catch (error) {
      return next(error);
    }
  };

  const update = async (req, res, next) => {
    try {
      const doc = await Model.findById(req.params.id);
      if (!doc) {
        return res.status(404).json({ success: false, message: `${entity} not found` });
      }
      const payload = beforeSave ? beforeSave(req.body, doc) : req.body;
      Object.assign(doc, payload);
      await doc.save();
      return res.status(200).json({ success: true, message: `${entity} updated successfully`, data: doc });
    } catch (error) {
      return next(error);
    }
  };

  const remove = async (req, res, next) => {
    try {
      const doc = await Model.findByIdAndDelete(req.params.id);
      if (!doc) {
        return res.status(404).json({ success: false, message: `${entity} not found` });
      }
      return res.status(200).json({
        success: true,
        message: `${entity} deleted successfully`,
        data: { id: req.params.id }
      });
    } catch (error) {
      return next(error);
    }
  };

  return { list, getById, create, update, remove };
};

/**
 * Case-insensitive contains matcher that escapes regex metacharacters.
 * Used by the HR list endpoints for the free-text search parameter.
 */
export const safeContains = (value) => new RegExp(String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
