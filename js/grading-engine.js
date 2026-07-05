// ============================================
// GRADING ENGINE
// Marks (obtained/total, weighted by component) -> percentage
// Percentage vs class average/stdev -> relative letter grade
// Letter grade -> GPA points (for CGPA/term GPA math)
// ============================================

(function () {
    const GRADE_POINTS = {
        'A+': 4.0, 'A': 4.0, 'A-': 3.7,
        'B+': 3.3, 'B': 3.0, 'B-': 2.7,
        'C+': 2.3, 'C': 2.0, 'C-': 1.7,
        'D+': 1.3, 'D': 1.0, 'F': 0.0
    };

    // Absolute fallback bands, used only when there's no class spread to curve against
    // (e.g. you're the only one with marks in so far).
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

    function mean(nums) {
        return nums.reduce((a, b) => a + b, 0) / nums.length;
    }

    function stdev(nums, avg) {
        if (nums.length < 2) return 0;
        const variance = nums.reduce((sum, n) => sum + (n - avg) ** 2, 0) / nums.length;
        return Math.sqrt(variance);
    }

    // Relative grading: your position vs the class's mean/spread, not a fixed cutoff.
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

    // Weighted percentage earned so far, out of the weightage actually graded.
    // marksRows: [{ obtained_marks, assessments: { total_marks, weightage } }]
    function weightedPercentage(marksRows) {
        let earnedWeighted = 0;
        let coveredWeightage = 0;
        marksRows.forEach(row => {
            const total = row.assessments.total_marks;
            const weightage = row.assessments.weightage;
            if (!total || !weightage) return;
            earnedWeighted += (row.obtained_marks / total) * weightage;
            coveredWeightage += weightage;
        });
        if (coveredWeightage === 0) return null;
        return (earnedWeighted / coveredWeightage) * 100;
    }

    // Builds a per-user summary for one course: percentage, projected letter/points, rank.
    // allMarks: full getMarksForCourse() result (every user's rows for that course)
    function courseStandings(allMarks) {
        const byUser = {};
        allMarks.forEach(row => {
            if (!byUser[row.username]) byUser[row.username] = [];
            byUser[row.username].push(row);
        });

        const percentages = Object.entries(byUser).map(([username, rows]) => ({
            username,
            percentage: weightedPercentage(rows)
        })).filter(u => u.percentage !== null);

        const pctValues = percentages.map(u => u.percentage);
        const classMean = pctValues.length ? mean(pctValues) : 0;
        const classStdev = pctValues.length ? stdev(pctValues, classMean) : 0;

        const standings = percentages.map(u => {
            const letter = relativeBand(u.percentage, classMean, classStdev);
            return {
                username: u.username,
                percentage: u.percentage,
                letter,
                gradePoints: GRADE_POINTS[letter]
            };
        }).sort((a, b) => b.percentage - a.percentage);

        standings.forEach((u, i) => { u.rank = i + 1; });

        return { standings, classAverage: pctValues.length ? classMean : null };
    }

    // Leaderboard for a single assessment (one quiz, one midterm, etc.)
    // rows: marks rows already filtered to one assessment_id
    function assessmentLeaderboard(rows, totalMarks) {
        return rows
            .map(r => ({ username: r.username, obtained: r.obtained_marks, percentage: (r.obtained_marks / totalMarks) * 100 }))
            .sort((a, b) => b.percentage - a.percentage)
            .map((r, i) => ({ ...r, rank: i + 1 }));
    }

    window.GradingEngine = {
        GRADE_POINTS,
        weightedPercentage,
        courseStandings,
        assessmentLeaderboard,
        relativeBand,
    };
})();
