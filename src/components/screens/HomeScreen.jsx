export default function HomeScreen() {
  return (
    <div className="screen">
      <div className="statusBar">
        <div className="time"></div>
      </div>

      <div className="cardOutline">
        <div className="cardTitle">AI analyze</div>
        <div className="aiBox" />
      </div>

      <div className="spendingCard">
        <div className="sectionTitle">Your spending</div>

        <div className="twoCols">
          <div className="miniCard">
            <div className="miniTitle">Monthly planned payments</div>
            <div className="miniBody" />
          </div>

          <div className="miniCard">
            <div className="miniTitle">Payments this month</div>
            <div className="miniBody" />
          </div>
        </div>
      </div>

      <div className="actionGrid">
        <div className="actionTile">
          <div className="actionHeader">
            <span className="actionIcon">📷</span>
            <span>Add receipt</span>
          </div>
          <div className="plusBtn">+</div>
        </div>

        <div className="actionTile">
          <div className="actionHeader">
            <span className="actionIcon">🏷️</span>
            <span>Add spending</span>
          </div>
          <div className="plusBtn">+</div>
        </div>
      </div>

      <div className="bottomNav">
        <div className="navItem active">🏠</div>
        <div className="navItem">🧾</div>
        <div className="navItem">🧮</div>
        <div className="navItem">🏆</div>
        <div className="navItem">AI</div>
      </div>

      <div className="homeIndicator" />
    </div>
  );
}
