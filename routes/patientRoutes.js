import express from "express";
import multer from "multer";
import {
  createPatientByDoctor,
  createPatientByOrganization,
  getPatientById,
  getPatientsByDoctor,
  updatePatient,
  deletePatient,
  getMyPatients,
} from "../controllers/patientController.js";
import { protect, authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// CREATE PATIENT
router.post(
  "/doctor/create",
  protect,
  authorize("doctor"),
  upload.single("passport"),
  createPatientByDoctor
);

router.post(
  "/organization/create",
  protect,
  authorize("organization"),
  upload.single("passport"),
  createPatientByOrganization
);

// FETCH - SPECIFIC ROUTES FIRST
// Fetch all patients for logged-in doctor/organization
router.get("/my", protect, authorize("doctor", "organization"), getMyPatients);

// Fetch patients by specific doctor ID
router.get("/doctor/:doctorId", protect, authorize("doctor", "organization"), getPatientsByDoctor);

// FETCH - PARAMETERIZED ROUTES LAST
router.get("/:id", protect, getPatientById);

// UPDATE & DELETE
router.put("/:id", protect, updatePatient);
router.delete("/:id", protect, deletePatient);

export default router;