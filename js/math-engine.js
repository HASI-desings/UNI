// ============================================
// MATH ENGINE
// All the grading/ranking math lives here, isolated from UI code.
//
// GRADING MODEL
// Each course has a weightage matrix (courses.weightage_config), e.g.
// { quiz: 10, assignment: 10, presentation: 10, midterm: 30, final: 40 }
// summing to 100. Within a category, all graded assessments pool their
// marks together (sum obtained / sum total) to get that category's %.
// The course percentage is the weighted sum of category percentages,
// prorated over whichever categories actually have marks yet (so it reads
// as a live "projected" grade, not a grade with zeros for ungraded work).
//
// CLASS AVERAGE
// If a teacher-announced average was entered on an assessment
// (assessments.class_average, in the same units as obtained_marks), that's
// used for the class side of the comparison. Otherwise it's computed from
// whatever marks classmates have actually logged so far.
// ============================================

(function () {
    const GRADE_POINTS = {
        'A+': 4.0, 'A': 4.0, 'A-': 3.7,
        'B+': 3.3, 'B': 3.0, 'B-': 2.7,
        'C+': 2.3, 'C': 2.0, 'C-': 1.7,
        'D+': 1.3, 'D': 1.0, 'F': 0.0
    };

    function absoluteBand(pct) {
        if (pct >= 90) return 'A+';
        if (pct >= 85) return 'A';
        if (pct >= 80) return 'A-';
        if (pct >= 75) return 'B+';
        if (pct >= 70) return 'B';
        if (pct >= 65) return 'B-';
        if (pct >= 60) return 'C+';
        if (pct >= 55) return 'C';
        if (pct >= 50) return 'C-';
        if (pct >= 45) return 'D+';
        if (pct >= 40) return 'D';
        return 'F';
    }

    function mean(nums) { return nums.reduce((a, b) => a + b, 0) / nums.length; }

    function stdev(nums, avg) {
        if (nums.length < 2) return 0;
        return Math.sqrt(nums.reduce((sum, n) => sum + (n - avg) ** 2, 0) / nums.length);
    }

    function relativeBand(pct, classMean, classStdev) {
        if (!classStdev || classStdev < 1) return absoluteBand(pct);
        const z = (pct - classMean) / classStdev;
        if (z >= 1.5) return 'A+';
        if (z >= 1.1) return 'A';
        if (z >= 0.7) return 'A-';
        if (z >= 0.3) return 'B+';
        if (z >= -0.2) return 'B';
        if (z >= -0.6) return 'B-';
        if (z >= -1.0) return 'C+';
        if (z >= -1.4) return 'C';
        if (z >= -1.8) return 'C-';
        if (z >= -2.2) return 'D';
        return 'F';
    }

    const DEFAULT_WEIGHTAGE = { quiz: 10, assignment: 10, presentation: 10, midterm: 30, final: 40 };

    function validateWeightageConfig(config) {
        const total = Object.values(config).reduce((a, b) => a + Number(b), 0);
        return Math.round(total) === 100;
    }

    // Pools a user's marks by category: { quiz: {obtained, total}, ... }
    function poolByCategory(marksRows) {
        const pools = {};
        marksRows.forEach(row => {
            const cat = row.assessments.type;
            const total = Number(row.assessments.total_marks);
            if (!total) return;
            if (!pools[cat]) pools[cat] = { obtained: 0, total: 0 };
            pools[cat].obtained += Number(row.obtained_marks);
            pools[cat].total += total;
        });
        return pools;
    }

    // marksRows: this one user's rows, each with .assessments.{type,total_marks}
    // weightageConfig: course.weightage_config
    function userCoursePercentage(marksRows, weightageConfig) {
        const pools = poolByCategory(marksRows);
        let weightedSum = 0;
        let coveredWeight = 0;
        Object.entries(pools).forEach(([cat, pool]) => {
            const weight = Number(weightageConfig[cat] || 0);
            if (weight === 0 || pool.total === 0) return;
            const catPct = (pool.obtained / pool.total) * 100;
            weightedSum += catPct * weight;
            coveredWeight += weight;
        });
        if (coveredWeight === 0) return null;
        return weightedSum / coveredWeight;
    }

    // Class-side percentage for one category, preferring manual class_average
    // where a teacher announced one, falling back to whatever's been logged.
    function classPoolByCategory(allMarks, assessmentsById) {
        const pools = {};
        const seenAssessments = new Set();

        allMarks.forEach(row => {
            const assessment = assessmentsById[row.assessment_id];
            if (!assessment) return;
            const cat = assessment.type;
            if (!pools[cat]) pools[cat] = { obtained: 0, total: 0 };

            if (assessment.class_average != null && !seenAssessments.has(assessment.id)) {
                // Use the announced average once per assessment (not once per student row)
                pools[cat].obtained += Number(assessment.class_average);
                pools[cat].total += Number(assessment.total_marks);
                seenAssessments.add(assessment.id);
            } else if (assessment.class_average == null) {
                pools[cat].obtained += Number(row.obtained_marks);
                pools[cat].total += Number(assessment.total_marks);
            }
        });
        return pools;
    }

    // Full standings for a course: every user's %, rank, relative letter, class average.
    // allMarks: rows shaped like supabase-client's getMarksForCourse() result
    // (each row has .assessments = {type, total_marks, weightage, title, class_average, id})
    function courseStandings(allMarks, weightageConfig) {
        const config = weightageConfig || DEFAULT_WEIGHTAGE;
        const byUser = {};
        const assessmentsById = {};

        allMarks.forEach(row => {
            if (!byUser[row.username]) byUser[row.username] = [];
            byUser[row.username].push(row);
            assessmentsById[row.assessment_id] = { id: row.assessment_id, ...row.assessments };
        });

        const percentages = Object.entries(byUser).map(([username, rows]) => ({
            username,
            percentage: userCoursePercentage(rows, config)
        })).filter(u => u.percentage !== null);

        const pctValues = percentages.map(u => u.percentage);
        const classMean = pctValues.length ? mean(pctValues) : 0;
        const classStdev = pctValues.length ? stdev(pctValues, classMean) : 0;

        const standings = percentages.map(u => {
            const letter = relativeBand(u.percentage, classMean, classStdev);
            return { username: u.username, percentage: u.percentage, letter, gradePoints: GRADE_POINTS[letter] };
        }).sort((a, b) => b.percentage - a.percentage);

        standings.forEach((u, i) => { u.rank = i + 1; });

        return { standings, classAverage: pctValues.length ? classMean : null };
    }

    // Leaderboard for one specific assessment
    function assessmentLeaderboard(rows, totalMarks) {
        return rows
            .map(r => ({ username: r.username, obtained: r.obtained_marks, percentage: (r.obtained_marks / totalMarks) * 100 }))
            .sort((a, b) => b.percentage - a.percentage)
            .map((r, i) => ({ ...r, rank: i + 1 }));
    }

    // ---------- CLUTCH RATING ----------
    // Improvement in percentage points from Midterm category to Final category,
    // per user per course. Only counts users who have both.
    function clutchRating(allMarks) {
        const byUser = {};
        allMarks.forEach(row => {
            const cat = row.assessments.type;
            if (cat !== 'midterm' && cat !== 'final') return;
            if (!byUser[row.username]) byUser[row.username] = {};
            const total = Number(row.assessments.total_marks);
            if (!total) return;
            if (!byUser[row.username][cat]) byUser[row.username][cat] = { obtained: 0, total: 0 };
            byUser[row.username][cat].obtained += Number(row.obtained_marks);
            byUser[row.username][cat].total += total;
        });

        return Object.entries(byUser)
            .filter(([, cats]) => cats.midterm && cats.final)
            .map(([username, cats]) => {
                const midPct = (cats.midterm.obtained / cats.midterm.total) * 100;
                const finalPct = (cats.final.obtained / cats.final.total) * 100;
                return { username, midtermPct: midPct, finalPct, improvement: finalPct - midPct };
            })
            .sort((a, b) => b.improvement - a.improvement)
            .map((r, i) => ({ ...r, rank: i + 1 }));
    }

    // ---------- CONSISTENCY STREAK ----------
    // For one user: how many of their most-recent graded assessments (across
    // all courses, chronological) they scored above that assessment's class
    // average on, counting back from the latest until the first miss.
    // allUserMarksChronological: [{ obtained_marks, assessments: {total_marks, class_average, created_at}, classAveragePct }]
    function consistencyStreak(userRowsWithClassAvg) {
        const sorted = [...userRowsWithClassAvg].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        let streak = 0;
        for (const row of sorted) {
            if (row.userPct > row.classAveragePct) streak++;
            else break;
        }
        return streak;
    }

    // ---------- ATTENDANCE ----------
    function attendanceRate(records) {
        if (records.length === 0) return null;
        const present = records.filter(r => r.status === 'present').length;
        return (present / records.length) * 100;
    }

    window.MathEngine = {
        GRADE_POINTS,
        DEFAULT_WEIGHTAGE,
        validateWeightageConfig,
        userCoursePercentage,
        classPoolByCategory,
        courseStandings,
        assessmentLeaderboard,
        clutchRating,
        consistencyStreak,
        attendanceRate,
        relativeBand,
    };
})();
