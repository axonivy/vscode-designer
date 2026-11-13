package ch.ivyteam.smart.core.copilot;

/**
 * We run small single-resource skills before complexer ones,
 * to verify that single skills works well when used independently.
 */
interface Complexity {
  int INDEPENDENT = 1; // affects a single skill; targets one main resource
  int COMPOSITE = 2; // affects multiple resources simultaneously (e.g. Process its DataClass)
  int HEAVY = 3; // affects a large number of resources and multiple skills
}
