# 2026-01-06_FINAL_validation.md
# Final Validation Script

## Run After All Steps Complete
```bash
# 1. Type check
echo "=== Type Check ==="
npx tsc --noEmit
echo ""

# 2. Run tests
echo "=== Running Tests ==="
npm test
echo ""

# 3. Execute system
echo "=== Executing System ==="
npm start
echo ""

# 4. Verify database
echo "=== Verifying Orders ==="
npx prisma db execute --stdin <<EOF
SELECT
  p.name as patient,
  t.meal_time,
  t.scheduled_for,
  COUNT(tor.id) as items,
  SUM(r.calories) as total_calories
FROM tray_orders t
JOIN patients p ON t.patient_id = p.id
LEFT JOIN tray_order_recipes tor ON tor.tray_order_id = t.id
LEFT JOIN recipes r ON tor.recipe_id = r.id
GROUP BY p.name, t.meal_time, t.scheduled_for
ORDER BY t.scheduled_for;
EOF
echo ""

# 5. Run again to verify no duplicates
echo "=== Verify No Duplicates ==="
npm start
echo ""

echo "=== VALIDATION COMPLETE ==="
```

## Success Criteria
- [ ] No TypeScript errors
- [ ] All tests pass
- [ ] Orders created on first run
- [ ] No duplicate orders on second run
- [ ] Calorie totals within constraints
- [ ] Staff review flags present for default constraints