/**
 * PARALLAX GPA ENGINE
 * Zero-dependency GPA calculation module
 * Handles: term GPA, CGPA, grade resolution, What-If projections, trend analysis
 */

export class GPAEngine {
  constructor(gradeScales = null) {
    this.gradeScales = gradeScales || this.getDefaultScales();
  }

  /**
   * Get default grade scale (standard 4.0 scale)
   */
  getDefaultScales() {
    return {
      default: {
        A: { min: 90, points: 4.0 },
        B: { min: 80, points: 3.0 },
        C: { min: 70, points: 2.0 },
        D: { min: 60, points: 1.0 },
        F: { min: 0, points: 0.0 },
      },
    };
  }

  /**
   * Resolve raw score to letter grade and grade points
   * @param {number} rawScore - Raw percentage score (0-100)
   * @param {string} scaleKey - Grade scale identifier
   * @returns {object} { letterGrade, gradePoints }
   */
  resolveGrade(rawScore, scaleKey = 'default') {
    if (rawScore < 0 || rawScore > 100) {
      throw new Error('Raw score must be between 0 and 100');
    }

    const scale = this.gradeScales[scaleKey] || this.gradeScales.default;

    // Find matching grade
    for (const [letter, config] of Object.entries(scale)) {
      if (rawScore >= config.min) {
        return {
          letterGrade: letter,
          gradePoints: config.points,
        };
      }
    }

    // Fallback to F
    return {
      letterGrade: 'F',
      gradePoints: 0.0,
    };
  }

  /**
   * Calculate term GPA for a specific semester
   * @param {array} courses - Array of { creditHours, isLab, gradePoints }
   * @returns {number} Term GPA (0-4.0)
   */
  computeTermGPA(courses) {
    if (!courses || courses.length === 0) {
      return 0;
    }

    let totalPoints = 0;
    let totalCredits = 0;

    for (const course of courses) {
      const credits = course.creditHours || 0;
      const points = course.gradePoints || 0;
      const isLab = course.isLab || false;

      // Lab courses may have different weighting (typically 0.5x)
      const weight = isLab ? 0.5 : 1.0;
      const effectiveCredits = credits * weight;

      totalPoints += points * effectiveCredits;
      totalCredits += effectiveCredits;
    }

    if (totalCredits === 0) {
      return 0;
    }

    const gpa = totalPoints / totalCredits;
    return Math.round(gpa * 100) / 100; // Round to 2 decimals
  }

  /**
   * Calculate cumulative GPA across all semesters
   * @param {array} semesters - Array of semester objects with courses
   * @returns {number} Cumulative GPA (0-4.0)
   */
  computeCGPA(semesters) {
    if (!semesters || semesters.length === 0) {
      return 0;
    }

    let totalPoints = 0;
    let totalCredits = 0;

    for (const semester of semesters) {
      const courses = semester.courses || [];

      for (const course of courses) {
        const credits = course.creditHours || 0;
        const points = course.gradePoints || 0;
        const isLab = course.isLab || false;

        const weight = isLab ? 0.5 : 1.0;
        const effectiveCredits = credits * weight;

        totalPoints += points * effectiveCredits;
        totalCredits += effectiveCredits;
      }
    }

    if (totalCredits === 0) {
      return 0;
    }

    const cgpa = totalPoints / totalCredits;
    return Math.round(cgpa * 100) / 100;
  }

  /**
   * What-If Simulator: Project GPA with hypothetical grades
   * Runs entirely in memory, never touches database
   * @param {array} currentCourses - Current semester courses
   * @param {object} hypotheticalGrades - { courseId: gradePoints }
   * @returns {object} { projectedTermGPA, projectedCGPA, changes }
   */
  whatIfProjection(currentCourses, hypotheticalGrades = {}, allSemesters = []) {
    // Clone current courses and apply hypothetical grades
    const projectedCourses = currentCourses.map((course) => {
      if (hypotheticalGrades[course.id]) {
        return {
          ...course,
          gradePoints: hypotheticalGrades[course.id],
        };
      }
      return course;
    });

    const projectedTermGPA = this.computeTermGPA(projectedCourses);

    // For CGPA projection, combine projected semester with all previous semesters
    const projectedSemesters = [
      ...allSemesters,
      { courses: projectedCourses },
    ];
    const projectedCGPA = this.computeCGPA(projectedSemesters);

    // Calculate current values for comparison
    const currentTermGPA = this.computeTermGPA(currentCourses);
    const currentCGPA = this.computeCGPA([
      ...allSemesters,
      { courses: currentCourses },
    ]);

    return {
      projectedTermGPA,
      projectedCGPA,
      currentTermGPA,
      currentCGPA,
      termGPAChange: Math.round((projectedTermGPA - currentTermGPA) * 100) / 100,
      cgpaChange: Math.round((projectedCGPA - currentCGPA) * 100) / 100,
      hypotheticalGrades,
    };
  }

  /**
   * Build trend data for charts (term-over-term GPA progression)
   * @param {array} semesters - Array of semester objects with courses
   * @returns {array} Trend data points
   */
  buildTrendData(semesters) {
    const trends = [];
    let cumulativePoints = 0;
    let cumulativeCredits = 0;

    for (let i = 0; i < semesters.length; i++) {
      const semester = semesters[i];
      const courses = semester.courses || [];

      // Calculate term GPA
      const termGPA = this.computeTermGPA(courses);

      // Accumulate for CGPA
      for (const course of courses) {
        const credits = course.creditHours || 0;
        const points = course.gradePoints || 0;
        const isLab = course.isLab || false;
        const weight = isLab ? 0.5 : 1.0;
        const effectiveCredits = credits * weight;

        cumulativePoints += points * effectiveCredits;
        cumulativeCredits += effectiveCredits;
      }

      const cgpa =
        cumulativeCredits > 0
          ? Math.round((cumulativePoints / cumulativeCredits) * 100) / 100
          : 0;

      trends.push({
        semester: semester.name || `Semester ${i + 1}`,
        termGPA: Math.round(termGPA * 100) / 100,
        cgpa,
        creditsEarned: semester.creditsEarned || 0,
        index: i,
      });
    }

    return trends;
  }

  /**
   * Build per-course performance breakdown
   * @param {array} courses - Array of course objects
   * @returns {array} Course breakdown with stats
   */
  buildCourseBreakdown(courses) {
    return courses.map((course) => ({
      id: course.id,
      name: course.name,
      creditHours: course.creditHours,
      isLab: course.isLab,
      rawScore: course.rawScore,
      letterGrade: course.letterGrade,
      gradePoints: course.gradePoints,
      contribution: course.gradePoints * course.creditHours,
      percentile: this.estimatePercentile(course.gradePoints),
    }));
  }

  /**
   * Estimate percentile from grade points (rough estimate)
   * @param {number} gradePoints - Grade points (0-4.0)
   * @returns {number} Estimated percentile (0-100)
   */
  estimatePercentile(gradePoints) {
    // Rough mapping: 4.0 = 99th, 3.0 = 70th, 2.0 = 40th, 1.0 = 10th, 0.0 = 1st
    if (gradePoints >= 4.0) return 99;
    if (gradePoints >= 3.9) return 97;
    if (gradePoints >= 3.7) return 95;
    if (gradePoints >= 3.5) return 90;
    if (gradePoints >= 3.0) return 70;
    if (gradePoints >= 2.5) return 50;
    if (gradePoints >= 2.0) return 40;
    if (gradePoints >= 1.5) return 25;
    if (gradePoints >= 1.0) return 10;
    return 1;
  }

  /**
   * Calculate GPA impact of a single grade change
   * @param {array} courses - All courses
   * @param {string} courseId - Course to modify
   * @param {number} newGradePoints - New grade points
   * @returns {object} Impact analysis
   */
  analyzeGradeImpact(courses, courseId, newGradePoints) {
    const course = courses.find((c) => c.id === courseId);
    if (!course) {
      throw new Error('Course not found');
    }

    const oldGPA = this.computeTermGPA(courses);

    const modifiedCourses = courses.map((c) =>
      c.id === courseId ? { ...c, gradePoints: newGradePoints } : c
    );

    const newGPA = this.computeTermGPA(modifiedCourses);
    const impact = Math.round((newGPA - oldGPA) * 100) / 100;

    return {
      courseId,
      courseName: course.name,
      oldGradePoints: course.gradePoints,
      newGradePoints,
      oldGPA,
      newGPA,
      impact,
      impactPercent: Math.round((impact / oldGPA) * 100 * 100) / 100,
    };
  }

  /**
   * Find minimum grade needed to reach target GPA
   * @param {array} courses - Current courses with grades
   * @param {string} targetCourseId - Course to calculate for
   * @param {number} targetGPA - Target term GPA
   * @returns {object} Minimum grade info
   */
  calculateMinimumGrade(courses, targetCourseId, targetGPA) {
    const targetCourse = courses.find((c) => c.id === targetCourseId);
    if (!targetCourse) {
      throw new Error('Target course not found');
    }

    // Calculate total points and credits excluding target course
    let otherPoints = 0;
    let otherCredits = 0;

    for (const course of courses) {
      if (course.id !== targetCourseId) {
        const credits = course.creditHours || 0;
        const points = course.gradePoints || 0;
        const isLab = course.isLab || false;
        const weight = isLab ? 0.5 : 1.0;
        const effectiveCredits = credits * weight;

        otherPoints += points * effectiveCredits;
        otherCredits += effectiveCredits;
      }
    }

    // Calculate required grade points
    const targetCourseWeight = targetCourse.isLab ? 0.5 : 1.0;
    const targetCourseEffectiveCredits = targetCourse.creditHours * targetCourseWeight;
    const totalEffectiveCredits = otherCredits + targetCourseEffectiveCredits;

    const requiredPoints =
      targetGPA * totalEffectiveCredits - otherPoints;
    const requiredGradePoints =
      requiredPoints / targetCourseEffectiveCredits;

    // Clamp to valid range
    const clampedGradePoints = Math.max(0, Math.min(4.0, requiredGradePoints));

    return {
      courseId: targetCourseId,
      courseName: targetCourse.name,
      targetGPA,
      requiredGradePoints: Math.round(clampedGradePoints * 100) / 100,
      achievable: requiredGradePoints <= 4.0 && requiredGradePoints >= 0,
      estimatedLetterGrade: this.resolveGrade(
        (clampedGradePoints / 4.0) * 100
      ).letterGrade,
    };
  }

  /**
   * Get GPA statistics from a set of courses
   * @param {array} courses - Array of courses
   * @returns {object} Statistics
   */
  getStatistics(courses) {
    if (!courses || courses.length === 0) {
      return {
        count: 0,
        avgGradePoints: 0,
        highestGrade: null,
        lowestGrade: null,
        totalCredits: 0,
      };
    }

    const gradePoints = courses.map((c) => c.gradePoints || 0);
    const credits = courses.map((c) => c.creditHours || 0);

    return {
      count: courses.length,
      avgGradePoints: Math.round((gradePoints.reduce((a, b) => a + b, 0) / gradePoints.length) * 100) / 100,
      highestGrade: Math.max(...gradePoints),
      lowestGrade: Math.min(...gradePoints),
      totalCredits: credits.reduce((a, b) => a + b, 0),
      medianGrade: this.getMedian(gradePoints),
      standardDeviation: this.calculateStdDev(gradePoints),
    };
  }

  /**
   * Calculate median of array
   */
  getMedian(arr) {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  /**
   * Calculate standard deviation
   */
  calculateStdDev(arr) {
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const squareDiffs = arr.map((value) => Math.pow(value - mean, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / arr.length;
    return Math.sqrt(avgSquareDiff);
  }
}

// Export singleton instance
export const gpaEngine = new GPAEngine();
