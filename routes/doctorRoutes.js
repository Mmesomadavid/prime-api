import express from "express"
import {
  getDoctorsByOrganization,
  searchDoctors,
  getDoctorOrganizations,
  assignDoctorToOrganization,
  removeDoctorFromOrganization,
} from "../controllers/doctorController.js"

const router = express.Router()

// GET - Get doctors by organization
router.get("/organization/:organizationId", getDoctorsByOrganization)

// GET - Search doctors
router.get("/search", searchDoctors)

// GET - Get doctor's organizations
router.get("/:doctorId/organizations", getDoctorOrganizations)

// POST - Assign doctor to organization
router.post("/:doctorId/assign-organization", assignDoctorToOrganization)

// POST - Remove doctor from organization
router.post("/:doctorId/remove-organization", removeDoctorFromOrganization)

export default router
