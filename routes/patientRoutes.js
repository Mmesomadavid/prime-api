import express from "express"
import {
  createPatient,
  getPatientById,
  getPatientsByDoctor,
  getPatientsByOrganization,
  updatePatient,
  deletePatient,
} from "../controllers/patientController.js"

const router = express.Router()

// POST - Create a new patient
router.post("/", createPatient)

// GET - Get patient by ID
router.get("/:id", getPatientById)

// GET - Get all patients by doctor
router.get("/doctor/:doctorId", getPatientsByDoctor)

// GET - Get all patients by organization
router.get("/organization/:organizationId", getPatientsByOrganization)

// PUT - Update patient
router.put("/:id", updatePatient)

// DELETE - Delete patient
router.delete("/:id", deletePatient)

export default router
