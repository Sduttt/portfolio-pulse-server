import { configDotenv } from "dotenv";
import { connectDB } from "./db/index.js";
import express from "express";
import mongoose from "mongoose";

configDotenv();

connectDB();