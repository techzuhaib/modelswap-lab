import { addRating } from "@/app/actions";
export function RatingForm({
  comparisonId,
  leftId,
  rightId,
}: {
  comparisonId: string;
  leftId: string;
  rightId: string;
}) {
  return (
    <form action={addRating}>
      <input type="hidden" name="comparisonId" value={comparisonId} />
      <input type="hidden" name="leftId" value={leftId} />
      <input type="hidden" name="rightId" value={rightId} />
      <div className="grid3">
        {(["Identity", "Quality", "Adherence"] as const).map((metric) => (
          <div key={metric}>
            <strong>{metric}</strong>
            <div className="grid2">
              {(["left", "right"] as const).map((side) => (
                <label key={side}>
                  {side === "left" ? "A" : "B"} (1–5)
                  <select name={`${side}${metric}`} defaultValue="">
                    <option value="">Unrated</option>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <label>
        Overall preference
        <select name="winner" required>
          <option value="left">A</option>
          <option value="right">B</option>
          <option value="tie">Tie</option>
        </select>
      </label>
      <label>
        Reviewer notes
        <textarea name="notes" rows={2} />
      </label>
      <button>Submit blind rating</button>
    </form>
  );
}
